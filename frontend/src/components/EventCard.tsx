import { format } from 'date-fns';
import { ExternalLink, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EventWithDistance } from '@/services/eventService';
import { DISCIPLINE_LABELS } from '@/types/event';
import { getSortedLevels, LEVEL_STYLE_CLASSES } from '@/lib/eventLevels';

const DISCIPLINE_COLORS: Record<string, string> = {
  show_jumping: '#2D6A4F',
  dressage: '#4A6FA5',
  eventing: '#B5451B',
  unknown: '#94A3B8',
};

interface EventCardProps {
  event: EventWithDistance;
}

export function EventCard({ event }: EventCardProps) {
  const navigate = useNavigate();
  const sortedLevels = getSortedLevels(event.levels);
  const locationLine = event.distance !== null ? `${event.distance} km · ${event.city}` : event.city;
  const accentColor = DISCIPLINE_COLORS[event.discipline] ?? DISCIPLINE_COLORS.unknown;

  const handleCardClick = () => navigate(`/events/${event.id}`);

  return (
    <Card
      onClick={handleCardClick}
      className="group relative h-full cursor-pointer overflow-hidden rounded-xl border-border/70 shadow-event-card transition-all duration-200 hover:-translate-y-1 hover:shadow-event-float active:translate-y-0 active:shadow-event-card"
    >
      {/* Left discipline accent bar */}
      <div
        className="absolute left-0 top-0 h-full w-1"
        style={{ backgroundColor: accentColor }}
      />

      <CardContent className="flex h-full flex-col gap-2.5 pb-4 pl-5 pr-4 pt-4 text-left">
        {/* Top row: level badges + date badge */}
        <div className="flex items-start justify-between gap-2">
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

          {/* Date badge */}
          <div
            className="shrink-0 rounded-lg px-2 py-1 text-center"
            style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
          >
            <span className="block text-base font-bold leading-none">
              {format(new Date(event.dateStart), 'dd')}
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-wide">
              {format(new Date(event.dateStart), 'MMM')}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold leading-snug text-card-foreground">
          {event.name}
        </h3>

        {/* Location */}
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>📍</span>
          <span>{locationLine}</span>
        </p>

        {/* Discipline pill */}
        <span
          className="inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
        >
          {DISCIPLINE_LABELS[event.discipline]}
        </span>

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
