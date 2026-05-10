export type Discipline = 'show_jumping' | 'dressage' | 'eventing';
export type Level = 'E' | 'A' | 'L' | 'M' | 'S';

export interface EquestrianEvent {
  id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  dateStart: string; // ISO date string
  dateEnd: string;
  discipline: Discipline;
  levels: Level[];
  lat: number;
  lng: number;
  sourceUrl: string | null;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface EventFilters {
  city: string;
  radius: number | null; // km
  dateFrom: string | null;
  dateTo: string | null;
  discipline: Discipline | null;
  levels: Level[];
  mapBounds: MapBounds | null;
}

export interface UserLocation {
  lat: number;
  lng: number;
}

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  show_jumping: 'Show Jumping',
  dressage: 'Dressage',
  eventing: 'Eventing',
};
