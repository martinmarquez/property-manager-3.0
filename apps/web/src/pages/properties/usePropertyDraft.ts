import { useCallback } from 'react';

const PREFIX = 'corredor:prop-draft:';

export function usePropertyDraft<T>(key: string) {
  const storageKey = `${PREFIX}${key}`;

  const saveDraft = useCallback(
    (value: T) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(value));
      } catch {
        // Quota exceeded or private browsing — silently ignore
      }
    },
    [storageKey],
  );

  const loadDraft = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }, [storageKey]);

  const hasDraft = useCallback((): boolean => {
    try {
      return localStorage.getItem(storageKey) !== null;
    } catch {
      return false;
    }
  }, [storageKey]);

  return { saveDraft, loadDraft, clearDraft, hasDraft };
}
