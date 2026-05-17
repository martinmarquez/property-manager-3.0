import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ar.corredor.app',
  appName: 'Corredor',
  webDir: '../web/dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#070D1A',
    preferredContentMode: 'mobile',
    scrollEnabled: true,
  },
  android: {
    backgroundColor: '#070D1A',
    allowMixedContent: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#070D1A',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    Camera: {
      permissions: ['camera', 'photos'],
    },
  },
};

export default config;
