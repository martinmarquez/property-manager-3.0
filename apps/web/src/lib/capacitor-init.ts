import { isNative, isIOS } from './capacitor.js';

type Router = { navigate: (opts: { to: string }) => void; history: { back: () => void } };

export async function initCapacitor(router: Router) {
  if (!isNative()) return;

  const [
    { StatusBar, Style },
    { SplashScreen },
    { Keyboard, KeyboardResize },
    { App },
  ] = await Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
    import('@capacitor/keyboard'),
    import('@capacitor/app'),
  ]);

  StatusBar.setStyle({ style: Style.Dark });
  if (isIOS()) {
    StatusBar.setBackgroundColor({ color: '#070D1A' });
  }

  SplashScreen.hide();

  Keyboard.setResizeMode({ mode: KeyboardResize.Body });
  if (isIOS()) {
    Keyboard.setScroll({ isDisabled: false });
  }

  App.addListener('appUrlOpen', ({ url }) => {
    try {
      const { pathname } = new URL(url);
      const validPrefixes = ['/properties', '/contacts', '/deals', '/inbox', '/app'];
      if (validPrefixes.some(p => pathname.startsWith(p))) {
        router.navigate({ to: pathname });
      }
    } catch {
      // malformed URL
    }
  });

  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      router.history.back();
    } else {
      App.exitApp();
    }
  });
}
