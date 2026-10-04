"""Duplicate detection: normalized text + lightweight similarity."""

import re
from difflib import SequenceMatcher

_WS = re.compile(r"\s+")
_PUNCT = re.compile(r"[^\w\s]")


def normalize_text(text: str) -> str:
    text = text.lower()
    text = _PUNCT.sub("", text)
    return _WS.sub(" ", text).strip()


def similarity(a: str, b: str) -> float:
    na, nb = normalize_text(a), normalize_text(b)
    if not na or not nb:
        return 0.0
    if na == nb:
        return 1.0
    return SequenceMatcher(None, na, nb).ratio()


def is_duplicate(a: str, b: str, threshold: float = 0.80) -> bool:
    return similarity(a, b) >= threshold
