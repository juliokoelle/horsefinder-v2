import { useState, useCallback } from 'react';
import { EventFilters, Discipline, Level, MapBounds } from '@/types/event';

const LEVEL_ORDER: Level[] = ['S', 'M', 'L', 'A', 'E'];

const sortLevels = (levels: Level[]) =>
  [...levels].sort((a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b));

const defaultFilters: EventFilters = {
  city: '',
  radius: null,
  dateFrom: null,
  dateTo: null,
  discipline: null,
  levels: [],
  mapBounds: null,
};

export function useEventFilters() {
  const [filters, setFilters] = useState<EventFilters>(defaultFilters);

  const setCity = useCallback((city: string) => {
    setFilters((prev) => ({ ...prev, city }));
  }, []);

  const setRadius = useCallback((radius: number | null) => {
    setFilters((prev) => ({ ...prev, radius }));
  }, []);

  const setDateRange = useCallback((dateFrom: string | null, dateTo: string | null) => {
    setFilters((prev) => ({ ...prev, dateFrom, dateTo }));
  }, []);

  const setDiscipline = useCallback((discipline: Discipline | null) => {
    setFilters((prev) => ({ ...prev, discipline }));
  }, []);

  const setLevels = useCallback((levels: Level[]) => {
    setFilters((prev) => ({ ...prev, levels: sortLevels(levels) }));
  }, []);

  const toggleLevel = useCallback((level: Level) => {
    setFilters((prev) => {
      const levels = prev.levels.includes(level)
        ? prev.levels.filter((item) => item !== level)
        : [...prev.levels, level];

      return {
        ...prev,
        levels: sortLevels(levels),
      };
    });
  }, []);

  const setMapBounds = useCallback((mapBounds: MapBounds | null) => {
    setFilters((prev) => ({ ...prev, mapBounds }));
  }, []);

  const clearMapBounds = useCallback(() => {
    setFilters((prev) => ({ ...prev, mapBounds: null }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const setThisWeekend = useCallback(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    const saturday = new Date(now);
    saturday.setDate(now.getDate() + (dayOfWeek === 6 ? 0 : daysUntilSaturday));
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);

    setFilters((prev) => ({
      ...prev,
      dateFrom: saturday.toISOString().split('T')[0],
      dateTo: sunday.toISOString().split('T')[0],
    }));
  }, []);

  return {
    filters,
    setCity,
    setRadius,
    setDateRange,
    setDiscipline,
    setLevels,
    toggleLevel,
    setMapBounds,
    clearMapBounds,
    setThisWeekend,
    resetFilters,
  };
}
