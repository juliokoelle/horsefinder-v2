import { Component, ReactNode } from 'react';

interface MapErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface MapErrorBoundaryState {
  hasError: boolean;
}

export class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  state: MapErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Map failed to render safely.', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-border bg-card px-4 text-sm text-muted-foreground shadow-event-card">
          Map unavailable right now.
        </div>
      );
    }

    return this.props.children;
  }
}
