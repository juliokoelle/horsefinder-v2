import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { EventWithDistance } from '@/services/eventService';
import { MapBounds, UserLocation } from '@/types/event';
import { getSortedLevels, LEVEL_STYLE_CLASSES } from '@/lib/eventLevels';
import { Search } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';

interface EventMapProps {
  events: EventWithDistance[];
  userLocation?: UserLocation | null;
  activeBounds: MapBounds | null;
  onSearchArea: (bounds: MapBounds) => void;
  onMarkerSelect?: (eventId: string) => void;
  hoveredEventId?: string | null;
}

const DEFAULT_CENTER: L.LatLngExpression = [51.1657, 10.4515];
const DEFAULT_ZOOM = 6;

// Minimal clean tile layer – CartoDB Positron (low-detail, muted)
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

function createMarkerIcon(highlighted = false) {
  const size = highlighted ? 22 : 18;
  return L.divIcon({
    className: 'event-marker-wrapper',
    html: `<span class="event-marker-dot${highlighted ? ' event-marker-dot--highlight' : ''}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function getBoundsSnapshot(map: L.Map): MapBounds {
  const b = map.getBounds();
  return { north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() };
}

function haveBoundsChanged(active: MapBounds | null, next: MapBounds) {
  return !active ||
    Math.abs(active.north - next.north) > 0.01 ||
    Math.abs(active.south - next.south) > 0.01 ||
    Math.abs(active.east - next.east) > 0.01 ||
    Math.abs(active.west - next.west) > 0.01;
}

function escapeHtml(v: string) {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function createPopupContent(event: EventWithDistance) {
  const levels = getSortedLevels(event.levels)
    .map((l) => `<span class="inline-flex min-w-7 items-center justify-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${LEVEL_STYLE_CLASSES[l]}">${l}</span>`)
    .join('');

  return `
    <div class="min-w-[190px] space-y-2 text-sm">
      <p class="font-semibold leading-tight text-card-foreground">${escapeHtml(event.name)}</p>
      <p class="text-xs text-muted-foreground">${escapeHtml(event.city)}</p>
      <p class="text-xs text-muted-foreground">${format(new Date(event.dateStart), 'dd MMM')} – ${format(new Date(event.dateEnd), 'dd MMM yyyy')}</p>
      <div class="flex flex-wrap gap-1">${levels}</div>
      <a href="/events/${event.id}" class="inline-flex text-xs font-medium text-primary hover:underline">View details →</a>
    </div>
  `;
}

export function EventMap({ events, userLocation, activeBounds, onSearchArea, onMarkerSelect, hoveredEventId }: EventMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map());
  const activeBoundsRef = useRef<MapBounds | null>(activeBounds);
  const [showSearchBtn, setShowSearchBtn] = useState(false);

  const markerData = useMemo(() => events.map((e) => e), [events]);

  useEffect(() => { activeBoundsRef.current = activeBounds; setShowSearchBtn(false); }, [activeBounds]);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, { zoomControl: true, scrollWheelZoom: true });
    mapRef.current = map;

    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 18 }).addTo(map);

    const cluster = L.markerClusterGroup({
      maxClusterRadius: 45,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (c) => {
        const count = c.getChildCount();
        return L.divIcon({
          className: 'event-cluster-icon',
          html: `<span class="event-cluster">${count}</span>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });
      },
    });
    clusterRef.current = cluster;
    map.addLayer(cluster);

    const handleViewport = () => {
      if (!mapRef.current) return;
      setShowSearchBtn(haveBoundsChanged(activeBoundsRef.current, getBoundsSnapshot(mapRef.current)));
    };
    map.on('moveend', handleViewport);
    map.on('zoomend', handleViewport);

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => map.invalidateSize()) : null;
    ro?.observe(mapContainerRef.current);
    const frame = requestAnimationFrame(() => map.invalidateSize());

    return () => {
      cancelAnimationFrame(frame);
      ro?.disconnect();
      map.off('moveend', handleViewport);
      map.off('zoomend', handleViewport);
      cluster.clearLayers();
      clusterRef.current = null;
      map.remove();
      mapRef.current = null;
      markerMapRef.current.clear();
    };
  }, []);

  // Sync markers
  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;

    cluster.clearLayers();
    const newMap = new Map<string, L.Marker>();

    markerData.forEach((event) => {
      const marker = L.marker([event.lat, event.lng], { icon: createMarkerIcon(false) });
      marker.bindPopup(createPopupContent(event));
      marker.on('click', () => onMarkerSelect?.(event.id));
      cluster.addLayer(marker);
      newMap.set(event.id, marker);
    });

    markerMapRef.current = newMap;
  }, [markerData, onMarkerSelect]);

  // Fit bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (markerData.length > 0) {
      const bounds = L.latLngBounds(markerData.map((e) => [e.lat, e.lng] as [number, number]));
      if (userLocation) bounds.extend([userLocation.lat, userLocation.lng]);
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 11, animate: true });
      return;
    }
    if (userLocation) { map.setView([userLocation.lat, userLocation.lng], 8, { animate: true }); return; }
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: true });
  }, [markerData, userLocation]);

  // Highlight marker on card hover
  useEffect(() => {
    const markers = markerMapRef.current;
    markers.forEach((marker, id) => {
      marker.setIcon(createMarkerIcon(id === hoveredEventId));
      if (id === hoveredEventId) {
        marker.setZIndexOffset(1000);
      } else {
        marker.setZIndexOffset(0);
      }
    });
  }, [hoveredEventId]);

  return (
    <div className="relative h-[calc(100vh-220px)] min-h-[520px] overflow-hidden border-y border-border bg-card md:mx-auto md:max-w-7xl md:rounded-2xl md:border md:shadow-event-card">
      <div ref={mapContainerRef} className="h-full w-full" />

      {showSearchBtn && mapRef.current && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-[500] -translate-x-1/2">
          <Button
            size="sm"
            className="pointer-events-auto gap-2 rounded-full bg-primary px-5 font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
            onClick={() => {
              if (!mapRef.current) return;
              onSearchArea(getBoundsSnapshot(mapRef.current));
              setShowSearchBtn(false);
            }}
          >
            <Search className="h-3.5 w-3.5" />
            Search this area
          </Button>
        </div>
      )}
    </div>
  );
}
