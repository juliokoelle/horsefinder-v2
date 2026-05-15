"""
Backfill end_date for events where end_date = start_date.
Fetches the source_url detail page and extracts the date range from the heading.
Run once locally: python -m backend.backfill_end_dates
"""
from __future__ import annotations

import os
import re
import sys
import time
import logging
from datetime import datetime

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
SCRAPE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; HorseFinder/2.0; +https://horsefinder.de)",
    "Accept-Language": "de-DE,de;q=0.9",
}


def _iso(raw: str) -> str:
    v = raw.strip()
    if "." in v:
        parts = v.split(".")
        if len(parts) == 3:
            return f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
    return v


def _fetch_events() -> list[dict]:
    """Fetch all events where end_date = start_date and source_url is set."""
    rows, page, size = [], 0, 1000
    while True:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/events",
            headers=HEADERS,
            params={"select": "id,start_date,end_date,source_url",
                    "limit": size, "offset": page * size},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if not data:
            break
        for row in data:
            start = row.get("start_date", "")
            end = row.get("end_date", "")
            # Only process events where end = start (or end is null)
            if row.get("source_url") and (not end or _iso(end) == _iso(start)):
                rows.append(row)
        if len(data) < size:
            break
        page += 1
    return rows


def _extract_end_date(html: str) -> str | None:
    """Extract end date from heading like 'City (25.03.2026 - 29.03.2026)'."""
    m = re.search(
        r"\((\d{1,2}\.\d{1,2}\.\d{4})\s*[-–—]\s*(\d{1,2}\.\d{1,2}\.\d{4})\)",
        html,
    )
    if m:
        return _iso(m.group(2))
    return None


def _update_end_date(event_id: str, end_date: str) -> None:
    resp = requests.patch(
        f"{SUPABASE_URL}/rest/v1/events",
        headers={**HEADERS, "Prefer": "return=minimal"},
        params={"id": f"eq.{event_id}"},
        json={"end_date": end_date},
        timeout=15,
    )
    resp.raise_for_status()


def main() -> None:
    log.info("Fetching events with end_date = start_date…")
    events = _fetch_events()
    log.info("%d events to process", len(events))

    updated, same, fail = 0, 0, 0
    for i, event in enumerate(events):
        url = event["source_url"]
        log.info("[%d/%d] %s", i + 1, len(events), url)
        try:
            resp = requests.get(url, headers=SCRAPE_HEADERS, timeout=10)
            resp.raise_for_status()
            end = _extract_end_date(resp.text)
            start_iso = _iso(event["start_date"])
            if end and end != start_iso:
                _update_end_date(event["id"], end)
                log.info("  → updated end_date: %s", end)
                updated += 1
            else:
                log.info("  → single-day event")
                same += 1
        except Exception as e:
            log.warning("  → error: %s", e)
            fail += 1
        time.sleep(1.0)

    log.info("Done. %d updated, %d single-day, %d errors.", updated, same, fail)


if __name__ == "__main__":
    main()
