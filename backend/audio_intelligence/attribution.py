"""MVP speaker attribution WITHOUT diarization.

A microphone winning best-source selection says nothing about who spoke —
it only says which phone heard most clearly. Attribution here combines:

- the source participant of the winning segment (weak prior),
- temporal stickiness (don't flip speakers on every fragment),
- low-quality fallback to "unknown",
- genuinely conflicting simultaneous sources to "multiple".

pyannote (true diarization) plugs in later via diarization.py.
"""

from . import dedupe

STICKY_GAP_S = 2.5  # same-speaker continuation window
SWITCH_GAP_S = 0.8  # below this, keep the previous speaker (likely same utterance)
MIN_QUALITY = 0.22  # below this the source evidence is too weak


class TemporalVoter:
    def __init__(self) -> None:
        self.last_speaker: str | None = None
        self.last_end: float = 0.0
        self.last_confidence: float = 0.0

    def reset(self) -> None:
        self.last_speaker = None
        self.last_end = 0.0
        self.last_confidence = 0.0

    def vote(
        self,
        source_participant_id: str,
        start: float,
        end: float,
        quality: float,
        confidence: float,
    ) -> tuple[str, float, bool]:
        """Returns (speaker_id, confidence, ambiguous). Never raises."""
        if quality < MIN_QUALITY or confidence <= 0:
            return "unknown", 0.0, False

        gap = start - self.last_end
        speaker = source_participant_id
        conf = min(1.0, 0.45 + 0.4 * quality + 0.15 * confidence)
        ambiguous = False

        if self.last_speaker is not None and gap <= STICKY_GAP_S:
            if speaker == self.last_speaker:
                conf = min(1.0, conf + 0.1)  # consistent source: reinforce
            elif gap <= SWITCH_GAP_S and self.last_confidence >= 0.5:
                # Fragment of the same utterance: keep speaker, merge later.
                speaker = self.last_speaker
                conf = max(0.35, self.last_confidence - 0.1)

        self.last_speaker = speaker
        self.last_end = max(self.last_end, end)
        self.last_confidence = conf
        return speaker, conf, ambiguous

    def mark_overlap(self, speaker_ids: list[str], start: float, end: float) -> tuple[str, float, bool]:
        """Two genuinely different sources active at once: don't guess one."""
        texts = sorted(set(speaker_ids))
        if len(texts) <= 1:
            speaker = texts[0] if texts else "unknown"
            self.last_speaker = speaker if speaker not in ("unknown", "multiple") else self.last_speaker
            self.last_end = max(self.last_end, end)
            return speaker, 0.5, False
        self.last_speaker = None
        self.last_end = max(self.last_end, end)
        self.last_confidence = 0.0
        return "multiple", 0.4, True


def speakers_agree(a_text: str, b_text: str) -> bool:
    """Near-identical overlapping texts = same speech event, not overlap."""
    return dedupe.is_duplicate(a_text, b_text, threshold=0.75)
