import { useQuery } from '@tanstack/react-query';
import { fetchEvents, fetchEventById, EventWithDistance } from '@/services/apiService';
import { EventFilters, UserLocation } from '@/types/event';

export function useEvents(filters: EventFilters, userLocation?: UserLocation | null) {
  return useQuery<EventWithDistance[]>({
    queryKey: ['events', filters, userLocation ?? null],
    queryFn: () => fetchEvents(filters, userLocation),
    retry: 3,
    retryDelay: 2000,
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['event', id],
    queryFn: () => fetchEventById(id),
    enabled: !!id,
  });
}
