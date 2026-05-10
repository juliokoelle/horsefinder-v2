import { format } from 'date-fns';
import { Calendar, ExternalLink, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EventWithDistance } from '@/services/eventService';
import { DISCIPLINE_LABELS } from '@/types/event';
import { getSortedLevels, LEVEL_STYLE_CLASSES } from '@/lib/eventLevels';

interface EventCardProps {
  event: EventWithDistance;
}

export function EventCard({ event }: EventCardProps) {
  const navigate = useNavigate();
  const sortedLevels = getSortedLevels(event.levels);
  const locationLine = event.distance !== null ? `📍 ${event.distance} km • ${event.city}` : `📍 ${event.city}`;

  const handleCardClick = () => {
    navigate(`/events/${event.id}`);
  };

  return (
    <Card
      onClick={handleCardClick}
      className="group h-full cursor-pointer rounded-lg border-border/70 shadow-event-card transition-all duration-200 hover:-translate-y-1 hover:shadow-event-float active:translate-y-0 active:shadow-event-card"
    >
      <CardContent className="flex h-full flex-col gap-2.5 p-4 text-left">
        {/* Level badges */}
        <div className="flex flex-wrap gap-1.5">
          {sortedLevels.map((level) => (
            <span
              key={level}
              className={`inline-flex min-w-8 items-center justify-center rounded-full border px-2.5 py-1 text-xs font-bold leading-none ${LEVEL_STYLE_CLASSES[level]}`}
            >
              {level}
            </span>
          ))}
        </div>

        {/* Title – readable but not dominant */}
        <h3 className="text-sm font-semibold leading-snug text-card-foreground/90">
          {event.name}
        </h3>

        {/* Location */}
        <p className="text-sm text-muted-foreground">{locationLine}</p>

        {/* Date – slightly more visible */}
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground/70">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>
            {format(new Date(event.dateStart), 'dd MMM')} – {format(new Date(event.dateEnd), 'dd MMM yyyy')}
          </span>
        </div>

        {/* Discipline */}
        <p className="text-xs font-medium text-muted-foreground">{DISCIPLINE_LABELS[event.discipline]}</p>

        {/* Spacer */}
        <div className="mt-auto" />

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="default"
            className="h-8 gap-1 rounded-full px-3 text-xs font-semibold"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/events/${event.id}`);
            }}
          >
            More info
            <ArrowRight className="h-3 w-3" />
          </Button>

          {event.sourceUrl && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 rounded-full px-3 text-xs"
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer">
                Official page
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
