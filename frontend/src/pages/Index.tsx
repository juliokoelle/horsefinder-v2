import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { List, Map } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useEventFilters } from '@/hooks/useEventFilters';
import { useGeolocation } from '@/hooks/useGeolocation';
import { FilterBar } from '@/components/FilterBar';
import { EventList } from '@/components/EventList';
import { EventMap } from '@/components/EventMap';
import { MapErrorBoundary } from '@/components/MapErrorBoundary';
import { MapBounds } from '@/types/event';

const Index = () => {
  const [view, setView] = useState<'list' | 'map'>('list');
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);

  const { location, loading: locationLoading, requestLocation } = useGeolocation();
  const {
    filters, setCity, setRadius, setDateRange, setDiscipline,
    toggleLevel, setMapBounds, setThisWeekend, setThisWeek, setThisMonth, resetFilters,
  } = useEventFilters();

  const { data: events = [], isLoading, failureCount } = useEvents(filters, location);

  const handleSearchArea = (bounds: MapBounds) => setMapBounds(bounds);

  const handleMarkerSelect = (eventId: string) => {
    setHighlightedEventId(eventId);
    setView('list');
  };

  useEffect(() => {
    if (!highlightedEventId) return;
    const timer = setTimeout(() => setHighlightedEventId(null), 3000);
    return () => clearTimeout(timer);
  }, [highlightedEventId]);

  const statusText = isLoading
    ? failureCount > 0
      ? `Connecting to server… (attempt ${failureCount + 1} of 4)`
      : 'Loading events…'
    : `${events.length} event${events.length !== 1 ? 's' : ''} found`;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 shadow-md">
        {/* Green gradient band with logo + view toggle */}
        <div style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' }} className="px-4 py-4">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <Link to="/" className="group">
              <h1
                className="text-2xl font-bold text-white transition-opacity group-hover:opacity-85"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                🐴 HorseFinder
              </h1>
              <p className="mt-0.5 text-sm" style={{ color: 'rgba(255,255,255,0.70)' }}>
                Discover equestrian events across Germany
              </p>
            </Link>

            {/* Pill view toggle on dark background */}
            <div className="flex rounded-full border border-white/30 overflow-hidden">
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === 'list'
                    ? 'bg-white text-[#1B4332]'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                List
              </button>
              <button
                onClick={() => setView('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === 'map'
                    ? 'bg-white text-[#1B4332]'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Map className="h-3.5 w-3.5" />
                Map
              </button>
            </div>
          </div>
        </div>

        {/* White filter bar */}
        <div className="border-b border-border bg-white px-4 py-3 shadow-sm">
          <div className="mx-auto max-w-7xl">
            <FilterBar
              city={filters.city}
              onCityChange={setCity}
              onUseLocation={requestLocation}
              locationLoading={locationLoading}
              hasLocation={!!location}
              radius={filters.radius}
              onRadiusChange={setRadius}
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              onDateRangeChange={setDateRange}
              onThisWeekend={setThisWeekend}
              onThisWeek={setThisWeek}
              onThisMonth={setThisMonth}
              discipline={filters.discipline}
              onDisciplineChange={setDiscipline}
              levels={filters.levels}
              onToggleLevel={toggleLevel}
              onReset={resetFilters}
            />
          </div>
        </div>
      </header>

      <main className={view === 'map' ? 'px-0 py-4' : 'mx-auto max-w-7xl px-4 py-6'}>
        <div className={view === 'map'
          ? 'mx-auto mb-3 flex max-w-7xl items-center justify-between px-4'
          : 'mb-4 flex items-center justify-between'}>
          <p className="text-sm text-muted-foreground">{statusText}</p>
        </div>

        {view === 'list' ? (
          <EventList
            events={events}
            isLoading={isLoading}
            highlightedEventId={highlightedEventId}
            onHoverEvent={setHoveredEventId}
            onReset={resetFilters}
          />
        ) : (
          <MapErrorBoundary fallback={
            <div className="mx-auto flex h-[calc(100vh-220px)] min-h-[520px] max-w-7xl items-center justify-center rounded-2xl border border-border bg-card px-4 text-sm text-muted-foreground shadow-event-card">
              Map unavailable. Switch back to list view.
            </div>
          }>
            <EventMap
              events={events}
              userLocation={location}
              activeBounds={filters.mapBounds}
              onSearchArea={handleSearchArea}
              onMarkerSelect={handleMarkerSelect}
              hoveredEventId={hoveredEventId}
            />
          </MapErrorBoundary>
        )}
      </main>
    </div>
  );
};

export default Index;
