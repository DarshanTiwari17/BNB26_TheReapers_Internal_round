"""Silero VAD with a zero-dependency energy fallback.

Primary path uses silero-vad (onnx, CPU). If the model cannot load
(no weights/network), the pipeline keeps working on an RMS gate so a
missing model never kills a meeting.
"""

import numpy as np

from . import audio_io
from .models import SAMPLE_RATE

_CHUNK = 512  # silero 16k window
MAX_SEGMENT_S = 8.0  # cap: long utterances split so Whisper stays fast


class SileroVAD:
    def __init__(self, threshold: float = 0.5, min_speech_ms: int = 250, min_silence_ms: int = 300):
        self.threshold = threshold
        self.min_speech_ms = min_speech_ms
        self.min_silence_ms = min_silence_ms
        self._model = None
        self._load_error: str | None = None

    @property
    def available(self) -> bool:
        if self._model is None and self._load_error is None:
            self._try_load()
        return self._model is not None

    @property
    def load_error(self) -> str | None:
        return self._load_error

    def _try_load(self) -> None:
        try:
            import torch
            from silero_vad import load_silero_vad

            torch.set_num_threads(1)
            self._model = load_silero_vad()
            self._model.eval()
        except Exception as exc:  # offline, no weights, etc. -> fallback
            self._model = None
            self._load_error = str(exc)[:200]

    def segment(self, samples: np.ndarray) -> list[tuple[float, float]]:
        """Return [(start_s, end_s)] speech regions, each capped at
        MAX_SEGMENT_S so one long utterance never becomes one slow
        Whisper call. Never raises."""
        try:
            if self.available:
                regions = self._segment_silero(samples)
            else:
                regions = self._segment_energy(samples)
        except Exception:
            try:
                regions = self._segment_energy(samples)
            except Exception:
                return []
        out: list[tuple[float, float]] = []
        for start, end in regions:
            while end - start > MAX_SEGMENT_S:
                out.append((start, start + MAX_SEGMENT_S))
                start += MAX_SEGMENT_S
            out.append((start, end))
        return out

    def _segment_silero(self, samples: np.ndarray) -> list[tuple[float, float]]:
        import torch

        assert self._model is not None
        n = (len(samples) // _CHUNK) * _CHUNK
        if n == 0:
            return []
        audio = torch.from_numpy(samples[:n])
        probs: list[float] = []
        with torch.no_grad():
            for i in range(0, n, _CHUNK):
                chunk = audio[i:i + _CHUNK]
                if len(chunk) < _CHUNK:
                    break
                probs.append(float(self._model(chunk, SAMPLE_RATE).item()))
        return self._probs_to_regions(probs)

    def _probs_to_regions(self, probs: list[float]) -> list[tuple[float, float]]:
        frame_s = _CHUNK / SAMPLE_RATE
        regions: list[tuple[float, float]] = []
        start: int | None = None
        quiet_frames = 0
        need_quiet = max(1, int(self.min_silence_ms / 1000 / frame_s))
        for i, p in enumerate(probs):
            if p >= self.threshold:
                if start is None:
                    start = i
                quiet_frames = 0
            elif start is not None:
                quiet_frames += 1
                if quiet_frames >= need_quiet:
                    end = i - quiet_frames + 1
                    regions.append((start * frame_s, end * frame_s))
                    start = None
        if start is not None:
            regions.append((start * frame_s, len(probs) * frame_s))
        min_s = self.min_speech_ms / 1000
        merged: list[list[float]] = []
        for s, e in regions:
            if e - s < min_s:
                continue
            if merged and s - merged[-1][1] < self.min_silence_ms / 1000:
                merged[-1][1] = e
            else:
                merged.append([s, e])
        return [(s, e) for s, e in merged]

    def _segment_energy(self, samples: np.ndarray, threshold: float = 0.02) -> list[tuple[float, float]]:
        """Fallback gate: RMS per 100 ms frame with hangover. Never raises."""
        frame = SAMPLE_RATE // 10
        n = len(samples) // frame
        if n == 0:
            return []
        regions: list[tuple[float, float]] = []
        start: int | None = None
        quiet = 0
        for i in range(n):
            active = audio_io.rms(samples[i * frame:(i + 1) * frame]) >= threshold
            if active:
                if start is None:
                    start = i
                quiet = 0
            elif start is not None:
                quiet += 1
                if quiet >= 4:  # 400 ms hangover
                    regions.append((start * 0.1, (i - quiet + 1) * 0.1))
                    start = None
        if start is not None:
            regions.append((start * 0.1, n * 0.1))
        return [(s, e) for s, e in regions if e - s >= self.min_speech_ms / 1000]
