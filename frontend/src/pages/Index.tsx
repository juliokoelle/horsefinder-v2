import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { List, Map, Heart } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useEventFilters } from '@/hooks/useEventFilters';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/contexts/AuthContext';
import { FilterBar } from '@/components/FilterBar';
import { EventList } from '@/components/EventList';
import { EventMap } from '@/components/EventMap';
import { MapErrorBoundary } from '@/components/MapErrorBoundary';
import { MapBounds } from '@/types/event';
import { EventWithDistance } from '@/services/apiService';

type View = 'list' | 'map' | 'favorites';

const Index = () => {
  const [view, setView] = useState<View>('list');
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);

  const { user } = useAuth();
  const { location, loading: locationLoading, requestLocation } = useGeolocation();
  const {
    filters, setCity, setRadius, setDateRange, toggleDiscipline,
    toggleLevel, setMapBounds, setThisWeekend, setThisWeek, setThisMonth, resetFilters,
  } = useEventFilters();

  const { data: events = [], isLoading, failureCount } = useEvents(filters, location);
  const { favoriteIds, toggle: toggleFavorite, count: favoriteCount } = useFavorites();

  // Build the favorites list from currently-loaded events (optimistic, fast)
  const favoriteEvents: EventWithDistance[] = events.filter((e) => favoriteIds.has(e.id));

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

  function tabClass(t: View) {
    return `flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
      view === t ? 'bg-white text-[#1B4332]' : 'text-white/80 hover:text-white hover:bg-white/10'
    }`;
  }

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

            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex rounded-full border border-white/30 overflow-hidden">
                <button onClick={() => setView('list')} className={tabClass('list')}>
                  <List className="h-3.5 w-3.5" />
                  List
                </button>
                <button onClick={() => setView('map')} className={tabClass('map')}>
                  <Map className="h-3.5 w-3.5" />
                  Map
                </button>
                <button onClick={() => setView('favorites')} className={`${tabClass('favorites')} relative`}>
                  <Heart className="h-3.5 w-3.5" fill={view === 'favorites' ? '#1B4332' : 'none'} />
                  Meine Favoriten
                  {favoriteCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                      {favoriteCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Auth link */}
              {user ? (
                <span className="text-xs text-white/70 hidden sm:block">{user.email}</span>
              ) : (
                <Link
                  to="/login"
                  className="text-xs text-white/70 hover:text-white transition-colors hidden sm:block"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* White filter bar — hidden on favorites tab */}
        {view !== 'favorites' && (
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
                disciplines={filters.disciplines}
                onToggleDiscipline={toggleDiscipline}
                levels={filters.levels}
                onToggleLevel={toggleLevel}
                onReset={resetFilters}
              />
            </div>
          </div>
        )}
      </header>

      <main className={view === 'map' ? 'px-0 py-4' : 'mx-auto max-w-7xl px-4 py-6'}>
        {view === 'favorites' ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {favoriteCount === 0
                  ? 'No favorites yet'
                  : `${favoriteCount} favourite${favoriteCount !== 1 ? 's' : ''}`}
              </p>
            </div>
            {!user ? (
              <div className="flex flex-col items-center py-20 text-center">
                <Heart className="mb-4 h-12 w-12 text-muted-foreground/30" />
                <h3 className="mb-2 text-xl font-bold text-foreground">Sign in to save favourites</h3>
                <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                  Create a free account to bookmark events and access them from any device.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Sign in
                </Link>
              </div>
            ) : (
              <EventList
                events={favoriteEvents}
                isLoading={false}
                favoriteIds={favoriteIds}
                onFavoriteToggle={toggleFavorite}
                onReset={() => setView('list')}
              />
            )}
          </>
        ) : view === 'list' ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{statusText}</p>
            </div>
            <EventList
              events={events}
              isLoading={isLoading}
              highlightedEventId={highlightedEventId}
              onHoverEvent={setHoveredEventId}
              onReset={resetFilters}
              favoriteIds={favoriteIds}
              onFavoriteToggle={toggleFavorite}
            />
          </>
        ) : (
          <>
            <div className="mx-auto mb-3 flex max-w-7xl items-center justify-between px-4">
              <p className="text-sm text-muted-foreground">{statusText}</p>
            </div>
            <div style={{ isolation: 'isolate' }}>
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
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
