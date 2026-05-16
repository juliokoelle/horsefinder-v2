"""
Retry geocoding for the cities that Photon couldn't find with the basic query.
Uses aggressive name cleaning: strips event words, venue terms, years.
Falls back to international search (no country filter) for Luxembourg/NL events.
Run once locally: python -m backend.backfill_geocoding_retry
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

# Words that indicate a tournament/event name — not a place name
EVENT_WORDS = re.compile(
    r"\b(spring|dressur|pfingst|hallen|reit|winter|sommer|herbst|jugend|nachwuchs|kreismeister|landes|bundes|cup|turnier|meisterschaft|championat|optimum)\b",
    re.IGNORECASE,
)
# Venue-type words that prefix or follow the actual city name
VENUE_WORDS = re.compile(
    r"\b(reitanlage|reitstall|reitstadion|gestüt|gestut|hengststation|stall|anlage|jagdhaus|ecurie|rfv|rv|fc|sc|ev|e\.v\.|gmbh|ag|kg|ug)\b",
    re.IGNORECASE,
)
YEAR = re.compile(r"\b20\d{2}\b")


def _candidates(city: str) -> list[str]:
    """Generate progressively simpler search terms for a city string."""
    seen: dict[str, None] = {}
    def add(s: str) -> None:
        s = re.sub(r"\s+", " ", s).strip(" ,/-")
        if s and len(s) > 2:
            seen[s] = None

    add(city)

    # Step 1: strip GmbH and trailing company/venue junk
    s1 = re.sub(r"\s+(GmbH|AG|KG|UG|e\.V\.|eV)\b.*", "", city, flags=re.IGNORECASE).strip()
    add(s1)

    # Step 2: replace "/" with space
    s2 = s1.replace("/", " ").replace(" - ", " ").replace(",", " ")
    add(s2)

    # Step 3: strip venue-type words
    s3 = VENUE_WORDS.sub("", s2).strip()
    add(s3)

    # Step 4: strip event words and years
    s4 = YEAR.sub("", EVENT_WORDS.sub("", s3)).strip()
    add(s4)

    # Step 5: take first meaningful token (often the city name)
    for token in re.split(r"[\s/\-,]+", s4):
        token = token.strip()
        if len(token) > 3 and not VENUE_WORDS.match(token) and not YEAR.match(token):
            add(token)
            break

    # Step 6: take last meaningful token (sometimes city is at the end)
    tokens = [t.strip() for t in re.split(r"[\s/\-,]+", s4) if len(t.strip()) > 3]
    if tokens:
        add(tokens[-1])

    return list(seen.keys())


def _photon(q: str, countrycode: str | None = "de") -> tuple[float, float] | None:
    params: dict = {"q": q, "limit": 1}
    if countrycode:
        params["countrycode"] = countrycode
    try:
        resp = requests.get(
            "https://photon.komoot.io/api/",
            params=params,
            headers=PHOTON_HEADERS,
            timeout=8,
        )
        resp.raise_for_status()
        features = resp.json().get("features", [])
        if features:
            coords = features[0]["geometry"]["coordinates"]  # [lng, lat]
            return float(coords[1]), float(coords[0])
    except Exception as e:
        log.warning("Photon error for %r: %s", q, e)
    return None


def _geocode(city: str) -> tuple[float, float] | None:
    for q in _candidates(city):
        result = _photon(q, countrycode="de")
        if result:
            log.info("  → found via DE query %r", q)
            return result
    # Final fallback: try without country filter (catches Luxembourg, NL, etc.)
    for q in _candidates(city):
        result = _photon(q, countrycode=None)
        if result:
            log.info("  → found via international query %r", q)
            return result
    return None


def _fetch_failed_cities() -> dict[str, list[str]]:
    """Returns cities still at lat=0."""
    city_ids: dict[str, list[str]] = {}
    page, size = 0, 1000
    while True:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/events",
            headers=HEADERS,
            params={"select": "id,city", "lat": "eq.0", "limit": size, "offset": page * size},
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
    log.info("Fetching cities still at lat=0…")
    city_ids = _fetch_failed_cities()
    log.info("%d cities to retry", len(city_ids))

    ok, fail = 0, 0
    for i, city in enumerate(sorted(city_ids)):
        log.info("[%d/%d] %s", i + 1, len(city_ids), city)
        log.info("  candidates: %s", _candidates(city))
        coords = _geocode(city)
        if coords:
            _update_city(city, coords[0], coords[1])
            log.info("  → %.4f, %.4f", coords[0], coords[1])
            ok += 1
        else:
            log.warning("  → still not found")
            fail += 1

    log.info("Done. %d resolved, %d still failed.", ok, fail)


if __name__ == "__main__":
    main()
