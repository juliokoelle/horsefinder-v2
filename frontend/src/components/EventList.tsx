import { useEffect, useRef } from 'react';
import { EventCard } from '@/components/EventCard';
import { EventWithDistance } from '@/services/eventService';
import { Skeleton } from '@/components/ui/skeleton';

interface EventListProps {
  events: EventWithDistance[];
  isLoading: boolean;
  highlightedEventId?: string | null;
  onHoverEvent?: (eventId: string | null) => void;
}

export function EventList({ events, isLoading, highlightedEventId, onHoverEvent }: EventListProps) {
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!highlightedEventId) return;
    const el = cardRefs.current[highlightedEventId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedEventId]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-lg" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg">No events found matching your filters.</p>
        <p className="text-muted-foreground text-sm mt-1">Try adjusting your search criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {events.map((event) => (
        <div
          key={event.id}
          ref={(el) => { cardRefs.current[event.id] = el; }}
          className={`transition-all duration-500 rounded-lg ${highlightedEventId === event.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
          onMouseEnter={() => onHoverEvent?.(event.id)}
          onMouseLeave={() => onHoverEvent?.(null)}
        >
          <EventCard event={event} />
        </div>
      ))}
    </div>
  );
}
