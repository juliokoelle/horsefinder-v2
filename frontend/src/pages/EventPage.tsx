import { useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, MapPin, Calendar, Trophy, ExternalLink } from 'lucide-react';
import L from 'leaflet';
import { useEvent } from '@/hooks/useEvents';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MapErrorBoundary } from '@/components/MapErrorBoundary';
import { DISCIPLINE_LABELS } from '@/types/event';
import { getHighestLevel, LEVEL_STYLE_CLASSES, getSortedLevels, getMarkerTone } from '@/lib/eventLevels';
import { DISCIPLINE_COLORS } from '@/components/EventCard';
import 'leaflet/dist/leaflet.css';

const createMarkerIcon = (level: ReturnType<typeof getHighestLevel>) =>
  L.divIcon({
    className: 'event-marker-wrapper',
    html: `<span class="event-marker event-marker--${getMarkerTone(level)}"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

function EventLocationMap({ lat, lng, level }: { lat: number; lng: number; level: ReturnType<typeof getHighestLevel> }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: false }).setView([lat, lng], 12);
    mapRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);

    L.marker([lat, lng], { icon: createMarkerIcon(level) }).addTo(map);

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => map.invalidateSize()) : null;
    ro?.observe(containerRef.current);
    const frame = requestAnimationFrame(() => map.invalidateSize());

    return () => {
      cancelAnimationFrame(frame);
      ro?.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, level]);

  return <div ref={containerRef} className="h-full w-full" />;
}

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading } = useEvent(id!);

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-36 w-full" />
        <div className="mx-auto max-w-2xl space-y-4 p-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-center">
        <p className="text-lg text-muted-foreground">Event not found.</p>
        <Link to="/"><Button variant="link" className="mt-4">← Back to events</Button></Link>
      </div>
    );
  }

  const highestLevel = getHighestLevel(event.levels);
  const sortedLevels = getSortedLevels(event.levels);
  const accentColor = DISCIPLINE_COLORS[event.discipline] ?? DISCIPLINE_COLORS.unknown;
  const hasCoords = event.lat !== 0 || event.lng !== 0;
  const location = [event.city, event.state].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen bg-background">
      {/* Hero section */}
      <div style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' }} className="px-4 pb-8 pt-6">
        <div className="mx-auto max-w-2xl">
          <Link to="/">
            <button className="mb-5 flex items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to events
            </button>
          </Link>

          <div className="mb-3 flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: `${accentColor}30`, color: accentColor }}
            >
              {DISCIPLINE_LABELS[event.discipline]}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-white sm:text-3xl" style={{ fontFamily: "'Playfair Display', serif" }}>
            {event.name}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Info cards */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {format(new Date(event.dateStart), 'dd MMMM yyyy')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Location</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {location || event.city} 🇩🇪
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${accentColor}18` }}>
              <Trophy className="h-4 w-4" style={{ color: accentColor }} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Discipline</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {DISCIPLINE_LABELS[event.discipline]}
              </p>
            </div>
          </div>

          {sortedLevels.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <span className="text-sm font-bold text-primary">Lv</span>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Levels</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {sortedLevels.map((level) => (
                    <span
                      key={level}
                      className={`inline-flex min-w-8 items-center justify-center rounded-full border px-2.5 py-1 text-xs font-bold leading-none ${LEVEL_STYLE_CLASSES[level]}`}
                    >
                      {level}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Official page button */}
        {event.sourceUrl && (
          <div className="mb-6">
            <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer">
              <Button className="gap-2 rounded-full">
                <ExternalLink className="h-4 w-4" />
                Official event page
              </Button>
            </a>
          </div>
        )}

        {/* Map — only when coordinates are available */}
        {hasCoords && (
          <MapErrorBoundary>
            <div className="overflow-hidden rounded-2xl border border-border shadow-event-card">
              <p className="border-b border-border bg-card px-4 py-2.5 text-xs font-medium text-muted-foreground">
                📍 {event.city}
              </p>
              <div className="h-64">
                <EventLocationMap lat={event.lat} lng={event.lng} level={highestLevel} />
              </div>
            </div>
          </MapErrorBoundary>
        )}

        {!hasCoords && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card/50 p-4 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            Map loading — coordinates are being geocoded in the background.
          </div>
        )}
      </div>
    </div>
  );
}
