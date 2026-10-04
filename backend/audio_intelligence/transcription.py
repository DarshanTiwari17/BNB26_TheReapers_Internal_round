"""faster-whisper transcription. English-only for the MVP (WHISPER_LANGUAGE=en).

Transcription only — never translation.
"""

import math
import os
import threading

import numpy as np

MODEL_NAME = os.getenv("WHISPER_MODEL", "small")
_DEVICE = os.getenv("WHISPER_DEVICE", "auto")
_COMPUTE = os.getenv("WHISPER_COMPUTE_TYPE", "auto")
# English-only MVP: any other value falls back to "en".
_LANGUAGE = os.getenv("WHISPER_LANGUAGE", "en").strip().lower() or "en"
if _LANGUAGE != "en":
    _LANGUAGE = "en"

_model = None
_model_key: tuple | None = None
_lock = threading.Lock()
_load_error: str | None = None
# At most 2 concurrent Whisper inferences: transcribing is the expensive
# step, and unbounded parallel jobs would thrash GPU/CPU. transcribe()
# always runs inside a worker thread, so a blocking acquire is safe.
_infer_slots = threading.Semaphore(2)


def resolve_device() -> str:
    if _DEVICE != "auto":
        return _DEVICE
    try:
        import torch

        if torch.cuda.is_available():
            return "cuda"
    except Exception:
        pass
    return "cpu"


def resolve_compute_type(device: str) -> str:
    if _COMPUTE != "auto":
        return _COMPUTE
    return "float16" if device == "cuda" else "int8"


def resolve_language() -> str:
    """Configured transcription language. English-only MVP: always 'en'."""
    return _LANGUAGE


def get_model():
    """Cached model. Raises RuntimeError with a clear message on failure."""
    global _model, _model_key, _load_error
    key = (MODEL_NAME, resolve_device(), resolve_compute_type(resolve_device()))
    with _lock:
        if _model is not None and _model_key == key:
            return _model
        try:
            from faster_whisper import WhisperModel

            device = resolve_device()
            _model = WhisperModel(MODEL_NAME, device=device, compute_type=resolve_compute_type(device))
            _model_key = key
            _load_error = None
            return _model
        except Exception as exc:
            _model = None
            _load_error = str(exc)[:300]
            raise RuntimeError(f"whisper model '{MODEL_NAME}' failed to load: {_load_error}") from exc


def warmup() -> bool:
    """Preload the model (e.g. at server startup). Never raises; False on failure."""
    try:
        get_model()
        print(f"[whisper] model '{MODEL_NAME}' ready (device={resolve_device()}, language={resolve_language()})", flush=True)
        return True
    except Exception as exc:
        print(f"[whisper] warmup failed, will retry lazily: {exc}", flush=True)
        return False


def transcribe(samples: np.ndarray) -> tuple[str, float, str] | None:
    """Transcribe 16 kHz mono float32 English speech. Returns (text, confidence, language).

    None = failed/skipped (never raises). Language is always "en" (forced,
    never detected, never translated).
    """
    try:
        model = get_model()
        kwargs: dict = {
            "language": "en",
            "beam_size": 3,
            "temperature": 0.0,
            "vad_filter": False,  # we already ran our own VAD
            "condition_on_previous_text": False,  # segments are independent; avoids cross-speaker repetition
        }
        segments, _info = None, None
        with _infer_slots:
            segments, _info = model.transcribe(samples.astype(np.float32), **kwargs)
        texts: list[str] = []
        logprobs: list[float] = []
        for seg in segments:
            t = (seg.text or "").strip()
            if t:
                texts.append(t)
                logprobs.append(seg.avg_logprob if seg.avg_logprob is not None else -1.0)
        text = " ".join(texts).strip()
        if not text:
            return None
        confidence = math.exp(sum(logprobs) / len(logprobs)) if logprobs else 0.0
        return text, max(0.0, min(1.0, confidence)), "en"
    except Exception:
        return None
