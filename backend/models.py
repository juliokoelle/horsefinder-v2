from __future__ import annotations

from pydantic import BaseModel


class Event(BaseModel):
    id: str
    name: str
    city: str
    state: str
    country: str
    date_start: str
    date_end: str
    discipline: str
    levels: list[str]
    prize_money: float | None = None
    lat: float
    lng: float
    source_url: str | None = None
    distance: float | None = None
