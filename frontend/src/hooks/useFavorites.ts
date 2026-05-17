import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function useFavorites() {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }
    setLoading(true);
    supabase
      .from('favorites')
      .select('event_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setFavoriteIds(new Set(data.map((r) => r.event_id as string)));
        setLoading(false);
      });
  }, [user]);

  const toggle = useCallback(async (eventId: string): Promise<boolean> => {
    if (!user) return false;

    const isFav = favoriteIds.has(eventId);

    // optimistic update
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(eventId); else next.add(eventId);
      return next;
    });

    if (isFav) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('event_id', eventId);
      if (error) {
        // revert
        setFavoriteIds((prev) => { const next = new Set(prev); next.add(eventId); return next; });
      }
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, event_id: eventId });
      if (error) {
        setFavoriteIds((prev) => { const next = new Set(prev); next.delete(eventId); return next; });
      }
    }
    return true;
  }, [user, favoriteIds]);

  return { favoriteIds, loading, toggle, count: favoriteIds.size };
}
