import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { EventCard } from '@/components/EventCard';
import { EventWithDistance } from '@/services/apiService';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface EventListProps {
  events: EventWithDistance[];
  isLoading: boolean;
  highlightedEventId?: string | null;
  onHoverEvent?: (eventId: string | null) => void;
  onReset?: () => void;
}

export function EventList({ events, isLoading, highlightedEventId, onHoverEvent, onReset }: EventListProps) {
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-52 rounded-xl" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <div className="mb-5 text-7xl">🏇</div>
        <h3 className="mb-2 text-xl font-bold text-foreground">No events found</h3>
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          No equestrian events match your current filters. Try expanding your search area or adjusting the date range.
        </p>
        {onReset && (
          <Button variant="outline" onClick={onReset} className="gap-2 rounded-full">
            <X className="h-4 w-4" />
            Clear all filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <div
          key={event.id}
          ref={(el) => { cardRefs.current[event.id] = el; }}
          className={`rounded-xl transition-all duration-500 ${highlightedEventId === event.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
          onMouseEnter={() => onHoverEvent?.(event.id)}
          onMouseLeave={() => onHoverEvent?.(null)}
        >
          <EventCard event={event} />
        </div>
      ))}
    </div>
  );
}
