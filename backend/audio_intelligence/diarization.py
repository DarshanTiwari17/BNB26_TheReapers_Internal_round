"""Optional pyannote diarization interface. NOT required for the MVP.

If pyannote.audio is installed and PYANNOTE_MODEL is set, `get_diarizer()`
returns a working diarizer; otherwise it returns an unavailable stub whose
methods safely return None. The pipeline never depends on this module.
"""

import os


class SpeakerDiarizer:
    """Interface the future diarization stage must implement."""

    available: bool = False

    def diarize(self, samples, sample_rate: int = 16000) -> list[dict] | None:
        raise NotImplementedError


class UnavailableDiarizer(SpeakerDiarizer):
    def diarize(self, samples, sample_rate: int = 16000) -> None:
        return None


class PyannoteDiarizer(SpeakerDiarizer):
    available = True

    def __init__(self, model_name: str):
        from pyannote.audio import Pipeline

        self._pipeline = Pipeline.from_pretrained(model_name)

    def diarize(self, samples, sample_rate: int = 16000) -> list[dict] | None:
        try:
            import numpy as np
            import torch

            waveform = torch.from_numpy(np.asarray(samples, dtype=np.float32)).unsqueeze(0)
            result = self._pipeline({"waveform": waveform, "sample_rate": sample_rate})
            out = []
            for turn, _, speaker in result.itertracks(yield_label=True):
                out.append({"start": float(turn.start), "end": float(turn.end), "speaker": str(speaker)})
            return out
        except Exception:
            return None


def get_diarizer() -> SpeakerDiarizer:
    model_name = os.getenv("PYANNOTE_MODEL", "").strip()
    if not model_name:
        return UnavailableDiarizer()
    try:
        return PyannoteDiarizer(model_name)
    except Exception:
        return UnavailableDiarizer()
