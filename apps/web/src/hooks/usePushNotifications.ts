import { useEffect, useCallback, useRef } from 'react';
import { isNative } from '../lib/capacitor.js';

interface PushHandlers {
  onRegistered?: (token: string) => void;
  onNotificationTap?: (deepLink: string | undefined, data: Record<string, string>) => void;
}

export function usePushNotifications(handlers: PushHandlers = {}) {
  const ref = useRef(handlers);
  ref.current = handlers;

  const register = useCallback(async () => {
    if (!isNative()) return null;

    const { PushNotifications } = await import('@capacitor/push-notifications');

    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return null;

    await PushNotifications.register();

    PushNotifications.addListener('registration', (token) => {
      ref.current.onRegistered?.(token.value);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
      const data = event.notification.data ?? {};
      ref.current.onNotificationTap?.(data.deepLink, data);
    });

    return true;
  }, []);

  useEffect(() => {
    register();
  }, [register]);

  return { register };
}
