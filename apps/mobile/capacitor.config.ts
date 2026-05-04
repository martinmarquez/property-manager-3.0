import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ar.corredor.app',
  appName: 'Corredor',
  webDir: '../web/dist',
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#ffffff',
  },
  android: {
    backgroundColor: '#ffffff',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
