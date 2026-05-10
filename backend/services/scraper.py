"""
Scraper for nennung-online.de — FN equestrian event database.

Flow: GET search page → POST search (sets session state) → GET results (all in HTML).
Run one search per discipline code; dedup by source_url on upsert.
"""
from __future__ import annotations

import logging
import re
import time
from datetime import date, timedelta

import requests
from bs4 import BeautifulSoup

from backend.services.supabase_client import get_client

log = logging.getLogger(__name__)

BASE_URL = "https://www.nennung-online.de"
SEARCH_URL = f"{BASE_URL}/turnier/suchergebnis"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; HorseFinder/2.0; +https://horsefinder.de)"
    ),
    "Accept-Language": "de-DE,de;q=0.9",
}

# Main discipline codes → human-readable label stored in DB
DISCIPLINES: dict[str, str] = {
    "DRE": "Dressur",
    "SPR": "Springen",
    "GEV": "Vielseitigkeit",
    "SOS": "Breitensport",
    "VOL": "Voltigieren",
    "FAP": "Fahren",
}


def _make_session() -> requests.Session:
    s = requests.Session()
    s.headers.update(HEADERS)
    s.get(f"{BASE_URL}/turnier/suchen", timeout=15)
    return s


def _iso(german_date: str) -> str:
    """Convert '2026-05-16 00:00:00' to '2026-05-16'."""
    return german_date.strip().split(" ")[0]


def _fetch_results(
    session: requests.Session,
    pruefungsart: str,
    date_from: date,
    date_to: date,
) -> list[dict]:
    """Search and return parsed rows for one discipline."""
    fmt = "%d.%m.%Y"
    payload = {
        "ort": "",
        "plz": "",
        "radius": "0",
        "pruefungsart": pruefungsart,
        "beginn": date_from.strftime(fmt),
        "ende": date_to.strftime(fmt),
        "nennschluss_beginn": date_from.strftime(fmt),
        "nennschluss_ende": date_to.strftime(fmt),
        "searchEventSubmit": "Turniersuche starten",
    }
    session.post(
        SEARCH_URL,
        data=payload,
        headers={"Referer": f"{BASE_URL}/turnier/suchen", "Origin": BASE_URL},
        allow_redirects=False,
        timeout=15,
    )
    resp = session.get(SEARCH_URL, timeout=20)
    resp.raise_for_status()
    return _parse_table(resp.text)


def _parse_table(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", id="tableEvents")
    if not table:
        return []

    rows = []
    for tr in table.find("tbody").find_all("tr"):  # type: ignore[union-attr]
        tds = tr.find_all("td")
        if len(tds) < 6:
            continue

        # tds[0] = date text, tds[1] = ISO date, tds[2] = name+link,
        # tds[3] = Landesverband, tds[4] = Nennschluss text, tds[5] = ISO nennschluss
        iso_date_td = tds[1].get_text(strip=True)
        if not iso_date_td:
            continue

        link = tds[2].find("a")
        if not link:
            continue

        href = link.get("href", "")
        name = link.get_text(strip=True)
        source_url = f"{BASE_URL}{href}" if href.startswith("/") else href

        # State/Landesverband
        state = tds[3].get_text(strip=True)

        # City: extract from name or state — name often includes city
        # Format is typically "City/ Venue Name" or "City - Venue"
        city = re.split(r"[/\-–]", name)[0].strip()

        rows.append(
            {
                "title": name,
                "city": city,
                "country": "Germany",
                "start_date": _iso(iso_date_td),
                "source_url": source_url,
            }
        )
    return rows


def run_scraper(lookahead_days: int = 90) -> dict[str, int]:
    """
    Scrape tournaments for the next `lookahead_days` days.
    Returns {"upserted": N, "skipped": N}.
    """
    today = date.today()
    date_to = today + timedelta(days=lookahead_days)
    sb = get_client()

    seen: dict[str, dict] = {}  # source_url → row (dedup)

    for code, discipline_label in DISCIPLINES.items():
        log.info("Scraping discipline %s (%s)…", code, discipline_label)
        try:
            session = _make_session()
            rows = _fetch_results(session, code, today, date_to)
            for row in rows:
                url = row["source_url"]
                if url not in seen:
                    seen[url] = {**row, "discipline": discipline_label, "levels": ["Unknown"]}
            log.info("  %d events found", len(rows))
        except Exception:
            log.exception("Failed scraping %s", code)
        time.sleep(1)  # be polite between requests

    if not seen:
        log.warning("No events scraped — check site connectivity.")
        return {"upserted": 0, "skipped": 0}

    records = list(seen.values())
    log.info("Fetching existing source_urls…")

    # Fetch all existing source_urls to avoid duplicates (no unique constraint yet)
    existing_urls: set[str] = set()
    page = 0
    page_size = 1000
    while True:
        resp = (
            sb.from_("events")
            .select("source_url")
            .range(page * page_size, (page + 1) * page_size - 1)
            .execute()
        )
        if not resp.data:
            break
        for row in resp.data:
            existing_urls.add(row["source_url"])
        if len(resp.data) < page_size:
            break
        page += 1

    log.info("  %d already in DB", len(existing_urls))
    new_records = [r for r in records if r["source_url"] not in existing_urls]
    log.info("  %d new events to insert", len(new_records))

    inserted = 0
    for i in range(0, len(new_records), 200):
        batch = new_records[i : i + 200]
        sb.from_("events").insert(batch).execute()
        inserted += len(batch)

    return {"upserted": inserted, "skipped": len(records) - len(new_records)}
