import { useCallback, useState } from 'react';
import { isNative } from '../lib/capacitor.js';

interface BiometricState {
  available: boolean;
  biometryType: string | null;
}

export function useBiometricAuth() {
  const [state, setState] = useState<BiometricState>({ available: false, biometryType: null });

  const checkAvailability = useCallback(async () => {
    if (!isNative()) {
      setState({ available: false, biometryType: null });
      return false;
    }

    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');
      const result = await NativeBiometric.isAvailable();
      setState({ available: result.isAvailable, biometryType: result.biometryType?.toString() ?? null });
      return result.isAvailable;
    } catch {
      setState({ available: false, biometryType: null });
      return false;
    }
  }, []);

  const authenticate = useCallback(async (reason: string): Promise<boolean> => {
    if (!isNative()) return false;

    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');
      await NativeBiometric.verifyIdentity({ reason, title: 'Corredor' });
      return true;
    } catch {
      return false;
    }
  }, []);

  return { ...state, checkAvailability, authenticate };
}
