import { useEffect, useRef, useCallback } from 'react';
import { isNative } from '../lib/capacitor.js';

interface LifecycleHandlers {
  onResume?: () => void;
  onPause?: () => void;
  onKeyboardShow?: (height: number) => void;
  onKeyboardHide?: () => void;
}

export function useAppLifecycle(handlers: LifecycleHandlers = {}) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (!isNative()) return;

    let cleanup: Array<Promise<{ remove: () => void }>> = [];

    (async () => {
      const { App } = await import('@capacitor/app');
      const { Keyboard } = await import('@capacitor/keyboard');

      cleanup = [
        App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) ref.current.onResume?.();
          else ref.current.onPause?.();
        }),
        Keyboard.addListener('keyboardWillShow', (info) => {
          ref.current.onKeyboardShow?.(info.keyboardHeight);
          document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
        }),
        Keyboard.addListener('keyboardWillHide', () => {
          ref.current.onKeyboardHide?.();
          document.documentElement.style.setProperty('--keyboard-height', '0px');
        }),
      ];
    })();

    return () => {
      cleanup.forEach(p => p.then(h => h.remove()));
    };
  }, []);

  const getAppInfo = useCallback(async () => {
    if (!isNative()) return null;
    const { App } = await import('@capacitor/app');
    return App.getInfo();
  }, []);

  return { getAppInfo };
}
