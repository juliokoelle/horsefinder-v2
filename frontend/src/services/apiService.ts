import { EquestrianEvent, EventFilters } from '@/types/event';

export interface EventWithDistance extends EquestrianEvent {
  distance: number | null;
}

const API_URL = import.meta.env.VITE_API_URL ?? '';

if (!API_URL) {
  console.error('[HorseFinder] VITE_API_URL is not set — set it in .env.local');
}

async function apiFetch<T>(path: string, params: Record<string, string | number | boolean | string[]>): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => url.searchParams.append(key, v));
    } else {
      url.searchParams.set(key, String(value));
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

interface ApiEvent {
  id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  date_start: string;
  date_end: string;
  discipline: string;
  levels: string[];
  lat: number;
  lng: number;
  source_url: string | null;
  distance: number | null;
}

function mapEvent(r: ApiEvent): EventWithDistance {
  return {
    id: r.id,
    name: r.name,
    city: r.city,
    state: r.state,
    country: r.country,
    dateStart: r.date_start,
    dateEnd: r.date_end,
    discipline: r.discipline as EquestrianEvent['discipline'],
    levels: r.levels as EquestrianEvent['levels'],
    lat: r.lat,
    lng: r.lng,
    sourceUrl: r.source_url,
    distance: r.distance,
  };
}

export async function fetchEvents(
  filters: EventFilters,
  userLocation?: { lat: number; lng: number } | null,
): Promise<EventWithDistance[]> {
  const params: Record<string, string | number | string[]> = {};

  if (filters.disciplines?.length) params.discipline = filters.disciplines;
  if (filters.dateFrom)   params.date_from = filters.dateFrom;
  if (filters.dateTo)     params.date_to = filters.dateTo;
  if (filters.city.trim()) params.city = filters.city.trim();
  if (filters.levels.length) params.levels = filters.levels;

  if (userLocation && filters.radius) {
    params.lat       = userLocation.lat;
    params.lng       = userLocation.lng;
    params.radius_km = filters.radius;
  }

  if (filters.mapBounds) {
    const { north, south, east, west } = filters.mapBounds;
    params.bounds_n = north;
    params.bounds_s = south;
    params.bounds_e = east;
    params.bounds_w = west;
  }

  const data = await apiFetch<ApiEvent[]>('/events', params);
  return data.map(mapEvent);
}

export async function fetchEventById(id: string): Promise<EquestrianEvent | null> {
  try {
    const data = await apiFetch<ApiEvent>(`/events/${id}`, {});
    return mapEvent(data);
  } catch {
    return null;
  }
}
