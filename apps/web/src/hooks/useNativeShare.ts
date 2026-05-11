import { useCallback } from 'react';
import { isNative } from '../lib/capacitor.js';

interface ShareOptions {
  title: string;
  text?: string;
  url: string;
}

export function useNativeShare() {
  const share = useCallback(async (opts: ShareOptions): Promise<boolean> => {
    if (!isNative()) {
      if (navigator.share) {
        await navigator.share(opts);
        return true;
      }
      return false;
    }

    const { Share } = await import('@capacitor/share');
    await Share.share(opts);
    return true;
  }, []);

  return { share };
}
