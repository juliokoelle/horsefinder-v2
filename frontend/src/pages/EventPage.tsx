import { useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, MapPin, Calendar, Trophy, ExternalLink } from 'lucide-react';
import L from 'leaflet';
import { useEvent } from '@/hooks/useEvents';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MapErrorBoundary } from '@/components/MapErrorBoundary';
import { DISCIPLINE_LABELS } from '@/types/event';
import { getHighestLevel, LEVEL_STYLE_CLASSES, getSortedLevels, getMarkerTone } from '@/lib/eventLevels';
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
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-6 w-64" />
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link to="/">
        <Button variant="ghost" size="sm" className="-ml-2 mb-6 gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back to events
        </Button>
      </Link>

      <h1 className="mb-4 text-3xl font-bold text-foreground">{event.name}</h1>

      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{event.city}, {event.state}, Germany 🇩🇪</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {format(new Date(event.dateStart), 'dd MMMM yyyy')} – {format(new Date(event.dateEnd), 'dd MMMM yyyy')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-muted-foreground" />
          <Badge variant="secondary">{DISCIPLINE_LABELS[event.discipline]}</Badge>
        </div>
      </div>

      <div className="mb-6">
        <p className="mb-2 text-sm font-medium text-foreground">Levels</p>
        <div className="flex flex-wrap gap-2">
          {getSortedLevels(event.levels).map((level) => (
            <span key={level} className={`inline-flex min-w-9 items-center justify-center rounded-full border px-3 py-1 text-sm font-bold ${LEVEL_STYLE_CLASSES[level]}`}>
              {level}
            </span>
          ))}
        </div>
      </div>

      {event.sourceUrl && (
        <div className="mb-6">
          <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Official event page
            </Button>
          </a>
        </div>
      )}

      <MapErrorBoundary>
        <div className="h-64 overflow-hidden rounded-2xl border border-border shadow-event-card">
          <EventLocationMap lat={event.lat} lng={event.lng} level={highestLevel} />
        </div>
      </MapErrorBoundary>
    </div>
  );
}
