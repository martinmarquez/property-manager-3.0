import { useMemo } from 'react';
import { isNative, isIOS, isAndroid, getPlatform } from '../lib/capacitor.js';
import type { Platform } from '../lib/capacitor.js';

interface PlatformInfo {
  platform: Platform;
  isNative: boolean;
  isIOS: boolean;
  isAndroid: boolean;
}

export function usePlatform(): PlatformInfo {
  return useMemo(() => ({
    platform: getPlatform(),
    isNative: isNative(),
    isIOS: isIOS(),
    isAndroid: isAndroid(),
  }), []);
}
