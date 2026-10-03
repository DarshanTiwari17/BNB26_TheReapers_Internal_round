import unittest

from backend.room_manager import RoomManager


class RoomManagerTests(unittest.TestCase):
    def test_anchor_selection_prefers_highest_energy_participant(self):
        manager = RoomManager()
        room = manager.get_or_create("room-1")
        room["participants"]["a"] = {"id": "a", "name": "Alice", "energy": 0.8, "connected": True}
        room["participants"]["b"] = {"id": "b", "name": "Bob", "energy": 0.2, "connected": True}

        anchor = manager.select_anchor("room-1")
        self.assertEqual(anchor["id"], "a")

    def test_anchor_selection_ignores_disconnected_participants(self):
        manager = RoomManager()
        room = manager.get_or_create("room-1")
        room["participants"]["a"] = {"id": "a", "name": "Alice", "energy": 0.8, "connected": False}
        room["participants"]["b"] = {"id": "b", "name": "Bob", "energy": 0.6, "connected": True}

        anchor = manager.select_anchor("room-1")
        self.assertEqual(anchor["id"], "b")


if __name__ == "__main__":
    unittest.main()
