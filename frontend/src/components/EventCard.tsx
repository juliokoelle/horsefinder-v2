import { format } from 'date-fns';
import { ExternalLink, ArrowRight, MapPin, Trophy, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EventWithDistance } from '@/services/apiService';
import { DISCIPLINE_LABELS, Level } from '@/types/event';
import { getSortedLevels, LEVEL_STYLE_CLASSES } from '@/lib/eventLevels';
import { useAuth } from '@/contexts/AuthContext';

const VALID_LEVELS = new Set<Level>(['E', 'A', 'A*', 'A**', 'L', 'M', 'M*', 'S', 'WB']);

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
  isFavorite?: boolean;
  onFavoriteToggle?: (eventId: string) => void;
}

export function EventCard({ event, isFavorite = false, onFavoriteToggle }: EventCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sortedLevels = getSortedLevels(event.levels.filter((l) => VALID_LEVELS.has(l)));
  const locationLine = event.distance !== null ? `${event.distance} km · ${event.city}` : event.city;
  const accentColor = DISCIPLINE_COLORS[event.discipline] ?? DISCIPLINE_COLORS.unknown;

  const handleCardClick = () => navigate(`/events/${event.id}`);

  function handleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    onFavoriteToggle?.(event.id);
  }

  return (
    <Card
      onClick={handleCardClick}
      className="group relative h-full cursor-pointer overflow-hidden rounded-xl border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
      style={{ borderTop: `3px solid ${accentColor}` }}
    >
      <CardContent className="flex h-full flex-col gap-2.5 pb-4 pl-4 pr-4 pt-3.5 text-left">
        {/* Top row: discipline badge + date badge + heart */}
        <div className="flex items-start justify-between gap-2">
          {event.discipline !== 'unknown' ? (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
              {DISCIPLINE_LABELS[event.discipline]}
            </span>
          ) : (
            <span />
          )}

          <div className="flex shrink-0 items-center gap-1.5">
            {/* Heart / favorite */}
            <button
              type="button"
              onClick={handleFavorite}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-rose-500"
            >
              <Heart
                className="h-4 w-4"
                fill={isFavorite ? '#f43f5e' : 'none'}
                stroke={isFavorite ? '#f43f5e' : 'currentColor'}
              />
            </button>

            {/* Date badge */}
            <div className="rounded-md bg-muted px-2 py-1 text-center">
              {event.dateEnd && event.dateEnd !== event.dateStart ? (
                <>
                  <span className="block text-[11px] font-bold leading-tight text-foreground">
                    {format(new Date(event.dateStart), 'dd')}–{format(new Date(event.dateEnd), 'dd')}
                  </span>
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {format(new Date(event.dateStart), 'MMM')}
                  </span>
                </>
              ) : (
                <>
                  <span className="block text-base font-bold leading-none text-foreground">
                    {format(new Date(event.dateStart), 'dd')}
                  </span>
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {format(new Date(event.dateStart), 'MMM')}
                  </span>
                </>
              )}
            </div>
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

        {/* Level badges + prize money */}
        {(sortedLevels.length > 0 || event.prize_money) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {sortedLevels.map((level) => (
              <span
                key={level}
                className={`inline-flex min-w-8 items-center justify-center rounded-full border px-2.5 py-1 text-xs font-bold leading-none ${LEVEL_STYLE_CLASSES[level]}`}
              >
                {level}
              </span>
            ))}
            {event.prize_money && event.prize_money > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-yellow-300/50 bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-700">
                <Trophy className="h-3 w-3" />
                {event.prize_money.toLocaleString('de-DE')} €
              </span>
            )}
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
