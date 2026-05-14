import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { MapPin, Navigation, CalendarIcon, X, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Discipline, Level } from '@/types/event';
import { LEVEL_STYLE_CLASSES, getSortedLevels } from '@/lib/eventLevels';

interface FilterBarProps {
  city: string;
  onCityChange: (city: string) => void;
  onUseLocation: () => void;
  locationLoading: boolean;
  hasLocation: boolean;
  radius: number | null;
  onRadiusChange: (radius: number | null) => void;
  dateFrom: string | null;
  dateTo: string | null;
  onDateRangeChange: (from: string | null, to: string | null) => void;
  onThisWeekend: () => void;
  discipline: Discipline | null;
  onDisciplineChange: (d: Discipline | null) => void;
  levels: Level[];
  onToggleLevel: (level: Level) => void;
  onReset: () => void;
}

const LEVEL_OPTIONS: Level[] = ['E', 'A', 'L', 'M', 'S'];

export function FilterBar({
  city,
  onCityChange,
  onUseLocation,
  locationLoading,
  hasLocation,
  radius,
  onRadiusChange,
  dateFrom,
  dateTo,
  onDateRangeChange,
  onThisWeekend,
  discipline,
  onDisciplineChange,
  levels = [],
  onToggleLevel,
  onReset,
}: FilterBarProps) {
  const [datePickerDate, setDatePickerDate] = useState<{ from: Date; to?: Date } | undefined>(undefined);

  const hasActiveFilters = !!(city || radius || dateFrom || dateTo || discipline || levels.length);
  const selectedLevels = useMemo(() => getSortedLevels(levels ?? []), [levels]);
  const levelLabel = selectedLevels.length === 0
    ? 'All Levels'
    : selectedLevels.length <= 2
      ? selectedLevels.join(', ')
      : `${selectedLevels.length} levels`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex min-w-[180px] flex-1 items-center sm:flex-none">
        <MapPin className="pointer-events-none absolute left-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="City or region..."
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          className="h-10 w-full rounded-lg border-border/80 bg-card pl-9 text-sm shadow-sm sm:w-48"
        />
      </div>

      <Button
        variant="outline"
        size="sm"
        className="h-10 gap-1.5 rounded-lg border-border/80 bg-card px-3"
        onClick={onUseLocation}
        disabled={locationLoading}
      >
        <Navigation className={cn('h-3.5 w-3.5', hasLocation && 'text-primary')} />
        {locationLoading ? 'Locating...' : hasLocation ? 'Located' : 'Near me'}
      </Button>

      <Select
        value={radius?.toString() ?? 'any'}
        onValueChange={(v) => onRadiusChange(v === 'any' ? null : Number(v))}
      >
        <SelectTrigger className="h-10 w-[110px] rounded-lg border-border/80 bg-card text-sm shadow-sm">
          <SelectValue placeholder="Radius" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any dist.</SelectItem>
          <SelectItem value="10">10 km</SelectItem>
          <SelectItem value="25">25 km</SelectItem>
          <SelectItem value="50">50 km</SelectItem>
          <SelectItem value="100">100 km</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-10 gap-1.5 rounded-lg border-border/80 bg-card px-3 text-sm font-normal shadow-sm">
            <CalendarIcon className="h-3.5 w-3.5" />
            {dateFrom
              ? `${format(new Date(dateFrom), 'dd MMM')}${dateTo ? ` – ${format(new Date(dateTo), 'dd MMM')}` : ''}`
              : 'Date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto rounded-lg border-border/80 p-0" align="start">
          <div className="border-b border-border p-2">
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={onThisWeekend}>
              This Weekend
            </Button>
          </div>
          <Calendar
            mode="range"
            selected={datePickerDate}
            onSelect={(range) => {
              setDatePickerDate(range as { from: Date; to?: Date } | undefined);
              onDateRangeChange(
                range?.from ? range.from.toISOString().split('T')[0] : null,
                range?.to ? range.to.toISOString().split('T')[0] : null
              );
            }}
            className="pointer-events-auto p-3"
          />
        </PopoverContent>
      </Popover>

      <Select
        value={discipline ?? 'all'}
        onValueChange={(v) => onDisciplineChange(v === 'all' ? null : (v as Discipline))}
      >
        <SelectTrigger className="h-10 w-[150px] rounded-lg border-border/80 bg-card text-sm shadow-sm">
          <SelectValue placeholder="Discipline" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Disciplines</SelectItem>
          <SelectItem value="dressage">Dressage</SelectItem>
          <SelectItem value="show_jumping">Show Jumping</SelectItem>
          <SelectItem value="eventing">Eventing</SelectItem>
          <SelectItem value="driving">Driving</SelectItem>
          <SelectItem value="vaulting">Vaulting</SelectItem>
          <SelectItem value="leisure">Leisure</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-10 min-w-[128px] justify-between rounded-lg border-border/80 bg-card px-3 text-sm font-normal shadow-sm">
            <span>{levelLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] rounded-lg border-border/80 p-3" align="start">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">All Levels</p>
            {selectedLevels.length > 0 && (
              <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={() => selectedLevels.forEach(onToggleLevel)}>
                Clear
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {LEVEL_OPTIONS.map((level) => {
              const isActive = selectedLevels.includes(level);

              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => onToggleLevel(level)}
                  className={cn(
                    'inline-flex min-w-10 items-center justify-center rounded-full border px-3 py-1.5 text-sm font-bold transition-all',
                    LEVEL_STYLE_CLASSES[level],
                    !isActive && 'opacity-55'
                  )}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="h-10 gap-1 rounded-lg px-2 text-xs text-muted-foreground" onClick={onReset}>
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
