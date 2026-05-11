import { Capacitor } from '@capacitor/core';

export type Platform = 'ios' | 'android' | 'web';

export function getPlatform(): Platform {
  return Capacitor.getPlatform() as Platform;
}

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function isIOS(): boolean {
  return getPlatform() === 'ios';
}

export function isAndroid(): boolean {
  return getPlatform() === 'android';
}
