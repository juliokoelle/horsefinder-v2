"""
Geocode all events with lat=0 via Nominatim and write coordinates back to Supabase.
Run once locally: python -m backend.backfill_geocoding
"""
from __future__ import annotations

import os
import sys
import time
import logging

import requests
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", stream=sys.stdout)
log = logging.getLogger(__name__)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}
NOM_HEADERS = {"User-Agent": "horsefinder-backfill/1.0 (personal project)"}


def _fetch_cities() -> dict[str, list[str]]:
    """Returns {city: [id, ...]} for all events with lat=0."""
    city_ids: dict[str, list[str]] = {}
    page, size = 0, 1000
    while True:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/events",
            headers=HEADERS,
            params={"select": "id,city", "lat": "eq.0",
                    "limit": size, "offset": page * size},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if not data:
            break
        for row in data:
            city = row["city"]
            city_ids.setdefault(city, []).append(row["id"])
        if len(data) < size:
            break
        page += 1
    return city_ids


def _geocode(city: str) -> tuple[float, float] | None:
    resp = requests.get(
        "https://nominatim.openstreetmap.org/search",
        params={"q": city, "country": "Germany", "format": "json", "limit": 1},
        headers=NOM_HEADERS,
        timeout=8,
    )
    data = resp.json()
    if data:
        return float(data[0]["lat"]), float(data[0]["lon"])
    return None


def _update_city(city: str, lat: float, lng: float) -> int:
    resp = requests.patch(
        f"{SUPABASE_URL}/rest/v1/events",
        headers={**HEADERS, "Prefer": "return=minimal"},
        params={"city": f"eq.{city}"},
        json={"lat": lat, "lng": lng},
        timeout=15,
    )
    resp.raise_for_status()
    return 1


def main() -> None:
    log.info("Fetching cities with lat=0…")
    city_ids = _fetch_cities()
    log.info("%d unique cities across %d events", len(city_ids), sum(len(v) for v in city_ids.values()))

    ok, fail = 0, 0
    for i, city in enumerate(sorted(city_ids)):
        log.info("[%d/%d] Geocoding: %s", i + 1, len(city_ids), city)
        try:
            coords = _geocode(city)
            if coords:
                _update_city(city, coords[0], coords[1])
                log.info("  → %.4f, %.4f", coords[0], coords[1])
                ok += 1
            else:
                log.warning("  → not found")
                fail += 1
        except Exception as e:
            log.warning("  → error: %s", e)
            fail += 1
        time.sleep(1.1)

    log.info("Done. %d geocoded, %d failed.", ok, fail)


if __name__ == "__main__":
    main()
