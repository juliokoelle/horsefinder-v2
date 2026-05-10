import { useState, useEffect } from 'react';
import { useEvents } from '@/hooks/useEvents';
import { useEventFilters } from '@/hooks/useEventFilters';
import { useGeolocation } from '@/hooks/useGeolocation';
import { FilterBar } from '@/components/FilterBar';
import { EventList } from '@/components/EventList';
import { EventMap } from '@/components/EventMap';
import { ViewToggle } from '@/components/ViewToggle';
import { MapErrorBoundary } from '@/components/MapErrorBoundary';
import { MapBounds } from '@/types/event';

const Index = () => {
  const [view, setView] = useState<'list' | 'map'>('list');
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);

  const { location, loading: locationLoading, requestLocation } = useGeolocation();
  const {
    filters, setCity, setRadius, setDateRange, setDiscipline,
    toggleLevel, setMapBounds, setThisWeekend, resetFilters,
  } = useEventFilters();

  const { data: events = [], isLoading } = useEvents(filters, location);

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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">🐴 HorseFinder</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">Discover equestrian events across Germany</p>
            </div>
            <ViewToggle view={view} onViewChange={setView} />
          </div>

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
            discipline={filters.discipline}
            onDisciplineChange={setDiscipline}
            levels={filters.levels}
            onToggleLevel={toggleLevel}
            onReset={resetFilters}
          />
        </div>
      </header>

      <main className={view === 'map' ? 'px-0 py-4' : 'mx-auto max-w-7xl px-4 py-6'}>
        <div className={view === 'map'
          ? 'mx-auto mb-3 flex max-w-7xl items-center justify-between px-4'
          : 'mb-4 flex items-center justify-between'}>
          <p className="text-sm text-muted-foreground">
            {isLoading ? 'Loading...' : `${events.length} event${events.length !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {view === 'list' ? (
          <EventList
            events={events}
            isLoading={isLoading}
            highlightedEventId={highlightedEventId}
            onHoverEvent={setHoveredEventId}
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
