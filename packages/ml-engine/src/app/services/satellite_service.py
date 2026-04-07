# app/services/satellite_service.py
import random
import time


class SatelliteAISService:
    def __init__(self):
        # NORAD IDs and names inspired by the ground-station repo
        self.satellites = [
            {"id": 53383, "name": "HSE-AIS (Norad)"},
            {"id": 44419, "name": "JAISAT-1 (AIS-Cube)"},
            {"id": 53377, "name": "MIET-AIS (VesselLink)"},
            {"id": 43792, "name": "AISSAT-1"},
            {"id": 43784, "name": "AISSAT-2"},
        ]
        self.ground_stations = [
            "STATION-ALPHA (Athens)",
            "STATION-BETA (Svalbard)",
            "STATION-GAMMA (Azores)",
        ]

    def augment_vessels(self, vessels: list[dict]) -> list[dict]:
        """
        Injects satellite telemetry metadata into the vessel list.
        Simulates which vessels are currently within 'satellite footprint'.
        """
        now = time.time()
        for v in vessels:
            # 70% of vessels are currently detected by at least one satellite
            if random.random() < 0.7:
                sat = random.choice(self.satellites)
                v["intel"] = v.get("intel", {})
                v["intel"].update(
                    {
                        "source": "Satellite AIS",
                        "satellite": sat["name"],
                        "norad_id": sat["id"],
                        "ground_station": random.choice(self.ground_stations),
                        "signal_dbm": random.randint(-110, -85),
                        "last_ping": int(now - random.randint(0, 30)),
                    }
                )
        return vessels


satellite_ais = SatelliteAISService()
