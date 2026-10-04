"""Best-source selection across phones capturing the same moment.

Phones around a table hear the same speaker; transcribing every copy wastes
Whisper calls and creates duplicates. Segments overlapping in time (above an
IoU threshold) are treated as one speech event — only the winner is
transcribed. A microphone winning says nothing about WHO spoke.
"""

from .models import AudioSegment, QualityScore

OVERLAP_WINDOW_S = 1.0  # segments within this skew may be the same event
MIN_IOU = 0.30


def iou(a_start: float, a_end: float, b_start: float, b_end: float) -> float:
    latest, earliest = max(a_start, b_start), min(a_end, b_end)
    inter = max(0.0, earliest - latest)
    if inter <= 0:
        return 0.0
    union = max(a_end, b_end) - min(a_start, b_start)
    return inter / union if union > 0 else 0.0


def same_event(a: AudioSegment, b: AudioSegment) -> bool:
    if abs(a.start - b.start) > OVERLAP_WINDOW_S and abs(a.end - b.end) > OVERLAP_WINDOW_S:
        return False
    return iou(a.start, a.end, b.start, b.end) >= MIN_IOU


def group_events(segments: list[AudioSegment]) -> list[list[AudioSegment]]:
    groups: list[list[AudioSegment]] = []
    for seg in sorted(segments, key=lambda s: s.start):
        placed = False
        for group in groups:
            if any(same_event(seg, other) for other in group):
                group.append(seg)
                placed = True
                break
        if not placed:
            groups.append([seg])
    return groups


def pick_best(group: list[AudioSegment], qualities: dict[int, QualityScore]) -> AudioSegment:
    """Highest quality segment wins; ties prefer the earlier start."""
    order = {id(seg): i for i, seg in enumerate(group)}
    return max(group, key=lambda seg: (qualities[id(seg)].score, -seg.start, -order[id(seg)]))
