import { useCallback, useEffect, useState } from 'react';
import type { SavedView, PropertyFilter, ViewMode } from '../../routes/properties/-types.js';

const storageKey = (userId: string) => `corredor:saved_views:${userId}`;

export function useSavedViews(userId: string) {
  const [views, setViews] = useState<SavedView[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey(userId));
      return raw ? (JSON.parse(raw) as SavedView[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(views));
    } catch {
      // Storage quota exceeded — silent fail
    }
  }, [views, userId]);

  const saveView = useCallback(
    (name: string, filter: PropertyFilter, viewMode: ViewMode): SavedView => {
      const view: SavedView = {
        id: crypto.randomUUID(),
        name,
        filter,
        viewMode,
        savedAt: new Date().toISOString(),
      };
      setViews((prev) => [view, ...prev]);
      return view;
    },
    [],
  );

  const deleteView = useCallback((id: string) => {
    setViews((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const renameView = useCallback((id: string, name: string) => {
    setViews((prev) => prev.map((v) => (v.id === id ? { ...v, name } : v)));
  }, []);

  return { views, saveView, deleteView, renameView };
}
