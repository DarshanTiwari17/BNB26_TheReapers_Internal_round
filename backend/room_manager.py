from __future__ import annotations

import time
from typing import Any


class RoomManager:
    """Minimal room runtime for the Roundtable MVP.

    This version intentionally focuses on the core problem statement: each device
    sends audio energy plus metadata and the backend ranks connected participants
    by signal quality to pick the strongest active speaker. It is a practical
    orchestration layer that is deliberately simpler than heavy deep-learning
    diarization code, but it reflects the same distributed-acoustic strategy.
    """

    def __init__(self) -> None:
        self.rooms: dict[str, dict[str, Any]] = {}

    def get_or_create(self, session_id: str) -> dict[str, Any]:
        room = self.rooms.get(session_id)
        if room is None:
            room = {
                "session_id": session_id,
                "participants": {},
                "transcript": [],
                "active_speaker_id": None,
                "updated_at": time.time(),
            }
            self.rooms[session_id] = room
        return room

    def register_participant(self, session_id: str, participant_id: str, name: str, websocket: Any | None = None) -> dict[str, Any]:
        room = self.get_or_create(session_id)
        participant = room["participants"].get(participant_id)
        if participant is None:
            participant = {
                "id": participant_id,
                "name": name,
                "energy": 0.0,
                "connected": True,
                "last_seen": time.time(),
                "websocket": websocket,
            }
            room["participants"][participant_id] = participant
        else:
            participant["name"] = name
            participant["connected"] = True
            participant["last_seen"] = time.time()
            participant["websocket"] = websocket
        return participant

    def unregister_participant(self, session_id: str, participant_id: str) -> None:
        room = self.rooms.get(session_id)
        if room is None:
            return
        room["participants"].pop(participant_id, None)
        room["active_speaker_id"] = self.select_anchor(session_id)["id"] if self.select_anchor(session_id) else None
        room["updated_at"] = time.time()

    def update_energy(self, session_id: str, participant_id: str, energy: float) -> dict[str, Any] | None:
        room = self.rooms.get(session_id)
        if room is None:
            return None
        participant = room["participants"].get(participant_id)
        if participant is None:
            return None

        participant["energy"] = max(0.0, min(1.0, float(energy)))
        participant["last_seen"] = time.time()
        participant["connected"] = True

        anchor = self.select_anchor(session_id)
        room["active_speaker_id"] = anchor["id"] if anchor else None
        room["updated_at"] = time.time()
        return anchor

    def select_anchor(self, session_id: str) -> dict[str, Any] | None:
        room = self.rooms.get(session_id)
        if room is None:
            return None
        connected = [p for p in room["participants"].values() if p.get("connected") is True]
        if not connected:
            return None
        return max(connected, key=lambda p: float(p.get("energy", 0.0)))

    def add_transcript_line(self, session_id: str, participant_id: str, text: str, confidence: float = 0.7) -> dict[str, Any] | None:
        room = self.rooms.get(session_id)
        if room is None:
            return None
        participant = room["participants"].get(participant_id)
        if participant is None:
            return None

        line = {
            "participant_id": participant_id,
            "speaker": participant["name"],
            "text": text,
            "confidence": confidence,
            "timestamp": time.time(),
        }
        room["transcript"].append(line)
        room["updated_at"] = time.time()
        return line

    def room_snapshot(self, session_id: str) -> dict[str, Any]:
        room = self.get_or_create(session_id)
        active_speaker = self.select_anchor(session_id)
        return {
            "session_id": session_id,
            "participants": [
                {
                    "id": participant["id"],
                    "name": participant["name"],
                    "energy": participant["energy"],
                    "connected": participant.get("connected", True),
                    "last_seen": participant.get("last_seen", 0.0),
                }
                for participant in room["participants"].values()
            ],
            "active_speaker_id": active_speaker["id"] if active_speaker else None,
            "active_speaker_name": active_speaker["name"] if active_speaker else None,
            "transcript": room["transcript"][-20:],
        }
