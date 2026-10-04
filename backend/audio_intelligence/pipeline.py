"""Per-session intelligence orchestration. Never mixes participant streams.

Flow per ingested chunk: VAD -> quality -> cross-phone duplicate skip ->
Whisper (winner only) -> attribution -> fusion. Blocking work (Whisper)
runs in a threadpool so the signaling loop is never blocked. Any stage may
fail: the meeting continues, that segment is just skipped.
"""

import asyncio
import time

import numpy as np

from . import audio_io, attribution, dedupe, quality, selection, transcription
from .attribution import TemporalVoter
from .fusion import FusionStore
from .models import AudioSegment, FusedEntry, PipelineDecision
from .vad import SileroVAD

_DECISION_TTL_S = 30.0  # recent outcomes kept for duplicate suppression
_DUP_IOU = 0.35
_DUP_QUALITY_MARGIN = 0.05


class SessionIntelligence:
    def __init__(self) -> None:
        self.vad = SileroVAD()
        self.voter = TemporalVoter()
        self.fusion = FusionStore()
        self.decisions: list[PipelineDecision] = []
        self.session_t0 = time.time()

    def _prune(self, now: float) -> None:
        self.decisions = [d for d in self.decisions if now - d.end < _DECISION_TTL_S]

    def _duplicate_of(self, seg: AudioSegment, q: float, now: float) -> PipelineDecision | None:
        self._prune(now)
        for d in self.decisions:
            if selection.iou(seg.start, seg.end, d.start, d.end) >= _DUP_IOU and q <= d.quality + _DUP_QUALITY_MARGIN:
                return d
        return None

    def process_segment(self, seg: AudioSegment) -> list[FusedEntry]:
        """Full pipeline for one VAD segment. Returns new fused entries."""
        now = time.time()
        samples = np.asarray(seg.samples, dtype=np.float32)
        if samples.size < 1600 or audio_io.is_silent(samples):
            return []
        q = quality.score_segment(samples)
        if q.score <= 0.0:
            return []
        dup = self._duplicate_of(seg, q.score, now)
        if dup is not None:
            return []  # another phone's copy already transcribed
        result = transcription.transcribe(samples)
        if result is None:
            return []
        text, confidence, language = result
        # Guard against a second phone's near-identical text racing us.
        for d in self.decisions:
            if (
                selection.iou(seg.start, seg.end, d.start, d.end) >= _DUP_IOU
                and dedupe.is_duplicate(text, d.text)
            ):
                return []
        speaker, conf, ambiguous = self.voter.vote(seg.participant_id, seg.start, seg.end, q.score, confidence)
        entry = self.fusion.add(speaker, seg.start, seg.end, text, min(confidence, conf), seg.participant_id, ambiguous, language)
        new: list[FusedEntry] = []
        if entry is not None:
            new.append(entry)
            self.decisions.append(PipelineDecision(seg.start, seg.end, q.score, speaker, text))
        return new

    def ingest_chunk(self, participant_id: str, samples: np.ndarray, chunk_start: float) -> list[AudioSegment]:
        """VAD + quality split of one uploaded chunk (no Whisper yet)."""
        out: list[AudioSegment] = []
        for start, end in self.vad.segment(samples):
            part = samples[int(start * 16000):int(end * 16000)]
            if part.size < 1600 or audio_io.is_silent(part):
                continue
            out.append(AudioSegment(participant_id, chunk_start + start, chunk_start + end, part))
        return out

    def remove_participant(self, participant_id: str) -> None:
        """Drop one participant's pending state; history entries stay."""
        self.decisions = [d for d in self.decisions if d.speaker_id != participant_id]
        if self.voter.last_speaker == participant_id:
            self.voter.reset()


class IntelligencePipeline:
    """All sessions. Thin async shell; heavy work runs off the event loop."""

    def __init__(self) -> None:
        self.sessions: dict[str, SessionIntelligence] = {}

    def for_session(self, session_id: str) -> SessionIntelligence:
        state = self.sessions.get(session_id)
        if state is None:
            state = SessionIntelligence()
            self.sessions[session_id] = state
        return state

    async def ingest(
        self, session_id: str, participant_id: str, samples: np.ndarray, chunk_start: float
    ) -> list[FusedEntry]:
        state = self.for_session(session_id)
        segments = state.ingest_chunk(participant_id, samples, chunk_start)
        out: list[FusedEntry] = []
        seen: set[str] = set()
        for seg in segments:
            # process_segment returns the affected entry per segment; a merge
            # may return the SAME entry twice — emit each fused entry once.
            for entry in await asyncio.to_thread(state.process_segment, seg):
                if entry.id not in seen:
                    seen.add(entry.id)
                    out.append(entry)
        return out

    def transcript(self, session_id: str) -> list[dict]:
        state = self.sessions.get(session_id)
        return state.fusion.to_dicts() if state else []

    def remove_participant(self, session_id: str, participant_id: str) -> None:
        state = self.sessions.get(session_id)
        if state:
            state.remove_participant(participant_id)

    def end_session(self, session_id: str) -> None:
        self.sessions.pop(session_id, None)


pipeline = IntelligencePipeline()
