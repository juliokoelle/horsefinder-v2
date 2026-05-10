import { useState, useEffect } from 'react';
import { UserLocation } from '@/types/event';

interface GeolocationState {
  location: UserLocation | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    loading: false,
    error: null,
  });

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setState({ location: null, loading: false, error: 'Geolocation is not supported' });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          location: { lat: position.coords.latitude, lng: position.coords.longitude },
          loading: false,
          error: null,
        });
      },
      (err) => {
        setState({ location: null, loading: false, error: err.message });
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  return { ...state, requestLocation };
}
