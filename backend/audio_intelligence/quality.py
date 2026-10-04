"""Simple quality scoring: normalized RMS + estimated SNR - clipping penalty."""

import math

import numpy as np

from . import audio_io
from .models import SAMPLE_RATE, QualityScore


def score_segment(samples: np.ndarray) -> QualityScore:
    level = audio_io.rms(samples)
    peak = float(np.max(np.abs(samples))) if samples.size else 0.0
    clipping_ratio = float(np.mean(np.abs(samples) > 0.98)) if samples.size else 0.0

    # Noise floor ~= quietest decile of 100 ms frames; SNR vs overall RMS.
    frame = SAMPLE_RATE // 10
    n = max(1, len(samples) // frame)
    frame_levels = sorted(audio_io.rms(samples[i * frame:(i + 1) * frame]) for i in range(n))
    floor = frame_levels[max(0, len(frame_levels) // 10 - 1)] if frame_levels else 0.0
    snr_db = 20.0 * math.log10(level / (floor + 1e-6)) if level > 0 else 0.0
    snr_db = max(0.0, min(40.0, snr_db))

    norm_rms = max(0.0, min(1.0, (level - 0.005) / 0.20))
    norm_snr = snr_db / 40.0
    score = 0.55 * norm_rms + 0.45 * norm_snr - 0.6 * min(1.0, clipping_ratio * 5.0)
    score = max(0.0, min(1.0, score))
    return QualityScore(rms=level, snr_db=snr_db, clipping_ratio=clipping_ratio, score=score)
