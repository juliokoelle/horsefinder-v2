import { List, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ViewToggleProps {
  view: 'list' | 'map';
  onViewChange: (view: 'list' | 'map') => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex rounded-lg border border-border overflow-hidden">
      <Button
        variant={view === 'list' ? 'default' : 'ghost'}
        size="sm"
        className="rounded-none gap-1.5"
        onClick={() => onViewChange('list')}
      >
        <List className="h-4 w-4" />
        List
      </Button>
      <Button
        variant={view === 'map' ? 'default' : 'ghost'}
        size="sm"
        className="rounded-none gap-1.5"
        onClick={() => onViewChange('map')}
      >
        <Map className="h-4 w-4" />
        Map
      </Button>
    </div>
  );
}
