import { format } from 'date-fns';
import { ExternalLink, ArrowRight, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EventWithDistance } from '@/services/eventService';
import { DISCIPLINE_LABELS } from '@/types/event';
import { getSortedLevels, LEVEL_STYLE_CLASSES } from '@/lib/eventLevels';

export const DISCIPLINE_COLORS: Record<string, string> = {
  dressage:     '#3B82F6',
  show_jumping: '#10B981',
  eventing:     '#F59E0B',
  driving:      '#8B5CF6',
  vaulting:     '#EC4899',
  leisure:      '#06B6D4',
  unknown:      '#6B7280',
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
      className="group relative h-full cursor-pointer overflow-hidden rounded-xl shadow-event-card transition-all duration-200 hover:-translate-y-1 hover:shadow-event-float active:translate-y-0 active:shadow-event-card"
      style={{ borderLeft: `4px solid ${accentColor}` }}
    >

      <CardContent className="flex h-full flex-col gap-2.5 pb-4 pl-5 pr-4 pt-4 text-left">
        {/* Top row: discipline badge + date badge */}
        <div className="flex items-start justify-between gap-2">
          {event.discipline !== 'unknown' ? (
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
            >
              {DISCIPLINE_LABELS[event.discipline]}
            </span>
          ) : (
            <span />
          )}

          {/* Date badge */}
          <div
            className="shrink-0 rounded-lg px-2 py-1 text-center"
            style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
          >
            {event.dateEnd && event.dateEnd !== event.dateStart ? (
              <>
                <span className="block text-[11px] font-bold leading-tight">
                  {format(new Date(event.dateStart), 'dd')}–{format(new Date(event.dateEnd), 'dd')}
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-wide">
                  {format(new Date(event.dateStart), 'MMM')}
                </span>
              </>
            ) : (
              <>
                <span className="block text-base font-bold leading-none">
                  {format(new Date(event.dateStart), 'dd')}
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-wide">
                  {format(new Date(event.dateStart), 'MMM')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-bold leading-snug text-card-foreground">
          {event.name}
        </h3>

        {/* Location */}
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>{locationLine}</span>
        </p>

        {/* Level badges — only show if levels are known */}
        {sortedLevels.length > 0 && (
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
        )}

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
