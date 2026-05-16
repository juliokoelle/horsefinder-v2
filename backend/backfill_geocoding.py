"""
Geocode ALL events via Photon (Komoot/OSM) and write coordinates back to Supabase.
Re-geocodes everything — not just lat=0 — so Nominatim errors are corrected.
Run once locally: python -m backend.backfill_geocoding
"""
from __future__ import annotations

import os
import re
import sys
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
PHOTON_HEADERS = {"User-Agent": "horsefinder-backfill/1.0 (personal project)"}


def _fetch_all_cities() -> dict[str, list[str]]:
    """Returns {city: [id, ...]} for ALL events."""
    city_ids: dict[str, list[str]] = {}
    page, size = 0, 1000
    while True:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/events",
            headers=HEADERS,
            params={"select": "id,city", "limit": size, "offset": page * size},
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


def _normalize(city: str) -> str:
    """Replace '/' with space and strip known venue suffixes."""
    q = city.replace("/", " ").strip()
    q = re.sub(r"\s+(GmbH|e\.V\.|eV|AG|KG|UG)\b.*", "", q, flags=re.IGNORECASE).strip()
    return q


def _photon_query(q: str) -> tuple[float, float] | None:
    """Single Photon request. Returns (lat, lng) or None."""
    resp = requests.get(
        "https://photon.komoot.io/api/",
        params={"q": q, "countrycode": "de", "limit": 1},
        headers=PHOTON_HEADERS,
        timeout=8,
    )
    resp.raise_for_status()
    features = resp.json().get("features", [])
    if features:
        # GeoJSON: coordinates are [lng, lat]
        coords = features[0]["geometry"]["coordinates"]
        return float(coords[1]), float(coords[0])
    return None


def _geocode(city: str) -> tuple[float, float] | None:
    """Try original name, then normalized variant."""
    for q in dict.fromkeys([city, _normalize(city)]):  # deduplicated, order preserved
        result = _photon_query(q)
        if result:
            return result
    return None


def _update_city(city: str, lat: float, lng: float) -> None:
    resp = requests.patch(
        f"{SUPABASE_URL}/rest/v1/events",
        headers={**HEADERS, "Prefer": "return=minimal"},
        params={"city": f"eq.{city}"},
        json={"lat": lat, "lng": lng},
        timeout=15,
    )
    resp.raise_for_status()


def main() -> None:
    log.info("Fetching all cities (re-geocoding everything with Photon)…")
    city_ids = _fetch_all_cities()
    log.info("%d unique cities across %d events", len(city_ids), sum(len(v) for v in city_ids.values()))

    ok, fail = 0, 0
    for i, city in enumerate(sorted(city_ids)):
        log.info("[%d/%d] %s", i + 1, len(city_ids), city)
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

    log.info("Done. %d geocoded, %d failed.", ok, fail)


if __name__ == "__main__":
    main()
