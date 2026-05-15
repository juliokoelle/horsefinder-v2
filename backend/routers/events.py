from __future__ import annotations

import math
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from backend.models import Event
from backend.services.supabase_client import get_client

router = APIRouter(prefix="/events", tags=["events"])


def _map_row(row: dict, distance: float | None = None) -> Event:
    return Event(
        id=row["id"],
        name=row["title"],
        city=row["city"],
        state=row.get("state", ""),
        country=row.get("country", "DE"),
        date_start=row["start_date"],
        date_end=row.get("end_date") or row["start_date"],
        discipline=row["discipline"],
        levels=row.get("levels") or [],
        lat=row.get("latitude") or 0.0,
        lng=row.get("longitude") or 0.0,
        source_url=row.get("source_url"),
        distance=distance,
    )


@router.get("", response_model=list[Event])
def list_events(
    discipline: Annotated[list[str] | None, Query()] = None,
    date_from: str | None = None,
    date_to: str | None = None,
    city: str | None = None,
    levels: Annotated[list[str] | None, Query()] = None,
    lat: float | None = None,
    lng: float | None = None,
    radius_km: int | None = None,
    bounds_n: float | None = None,
    bounds_s: float | None = None,
    bounds_e: float | None = None,
    bounds_w: float | None = None,
) -> list[Event]:
    sb = get_client()

    # --- Path A: geo radius via RPC ---
    if lat is not None and lng is not None and radius_km:
        resp = sb.rpc("nearby_events", {
            "user_lat": lat,
            "user_lng": lng,
            "radius_km": radius_km,
        }).execute()
        if resp.data is None:
            raise HTTPException(502, "Supabase RPC error")

        events = [_map_row(r, distance=round(r["dist_km"])) for r in resp.data]

        if discipline:
            events = [e for e in events if e.discipline in discipline]
        if date_from:
            events = [e for e in events if e.date_end >= date_from]
        if date_to:
            events = [e for e in events if e.date_start <= date_to]
        if city:
            q = city.lower()
            events = [e for e in events if q in e.city.lower() or q in e.state.lower()]
        if levels:
            events = [e for e in events if any(l in e.levels for l in levels)]
        if all(v is not None for v in (bounds_n, bounds_s, bounds_e, bounds_w)):
            events = [
                e for e in events
                if bounds_s <= e.lat <= bounds_n and bounds_w <= e.lng <= bounds_e
            ]
        return events

    # --- Path B: standard table query ---
    query = sb.from_("events").select("*")

    if discipline:
        query = query.in_("discipline", discipline)
    if date_from:
        query = query.gte("start_date", date_from)
    if date_to:
        query = query.lte("start_date", date_to)
    if city:
        q = f"%{city}%"
        query = query.or_(f"city.ilike.{q},state.ilike.{q}")
    if levels:
        query = query.overlaps("levels", levels)
    if all(v is not None for v in (bounds_n, bounds_s, bounds_e, bounds_w)):
        query = (
            query
            .gte("latitude", bounds_s)
            .lte("latitude", bounds_n)
            .gte("longitude", bounds_w)
            .lte("longitude", bounds_e)
        )

    resp = query.execute()
    if resp.data is None:
        raise HTTPException(502, "Supabase query error")

    events = [_map_row(r) for r in resp.data]
    events.sort(key=lambda e: e.date_start)
    return events


@router.get("/{event_id}", response_model=Event)
def get_event(event_id: str) -> Event:
    resp = get_client().from_("events").select("*").eq("id", event_id).maybe_single().execute()
    if not resp.data:
        raise HTTPException(404, "Event not found")
    return _map_row(resp.data)
