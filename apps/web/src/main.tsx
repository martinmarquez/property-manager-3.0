import { initSentryBrowser, initPostHog } from '@corredor/telemetry/browser';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createRouter, RouterProvider, createRootRoute, createRoute, Outlet, redirect } from '@tanstack/react-router';

// Design system tokens (Google Fonts + CSS custom properties)
import '@corredor/ui/styles/tokens.css';

import {
  LoginPage,
  RegisterFlow,
  PasswordResetRequest,
  PasswordResetNew,
  TOTPSetup,
  AppShell,
} from '@corredor/ui';
import type { AppShellUser } from '@corredor/ui';
import { DashboardPage } from './pages/DashboardPage.js';
import {
  ContactsPage,
  LeadsPage,
  SettingsPage,
} from './pages/StubPage.js';
import { PropertyListPage } from './pages/properties/PropertyListPage.js';
import { OrganizationSettings } from '@corredor/ui';
import type { OrganizationData } from '@corredor/ui';

// Initialize telemetry before rendering. Empty DSN/key in dev is safe — SDKs no-op.
initSentryBrowser({
  dsn: import.meta.env.VITE_SENTRY_DSN ?? '',
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_SENTRY_RELEASE,
  tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
});

initPostHog({
  apiKey: import.meta.env.VITE_POSTHOG_KEY ?? '',
  host: import.meta.env.VITE_POSTHOG_HOST,
});

// ─── Mock session (replace with real auth store in Phase B) ──────────────────
const MOCK_USER: AppShellUser = {
  name: 'Martín Márquez',
  email: 'martin@corredor.ar',
  tenantName: 'Inmobiliaria del Centro',
};

const MOCK_ORG: OrganizationData = {
  agencyName: 'Inmobiliaria del Centro',
  cuit: '30-12345678-9',
  licenseNumber: '1234',
  description: '',
  phone: '+54 11 4444-5555',
  website: '',
  address: 'Av. Corrientes 1234',
  city: 'CABA',
  provincia: 'Buenos Aires (CABA)',
  foundingYear: '',
};

// ─── Root layout (wraps all authenticated routes) ────────────────────────────
function AuthenticatedLayout() {
  return (
    <AppShell user={MOCK_USER}>
      <Outlet />
    </AppShell>
  );
}

// ─── Routes ──────────────────────────────────────────────────────────────────
const rootRoute = createRootRoute();

// Public routes
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: function LoginRoute() {
    return (
      <LoginPage
        onSubmit={async (_data) => {
          await router.navigate({ to: '/' });
        }}
        onForgotPassword={() => router.navigate({ to: '/reset-password' })}
        onRegister={() => router.navigate({ to: '/register' })}
      />
    );
  },
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: function RegisterRoute() {
    return (
      <RegisterFlow
        onComplete={async (_data) => {
          await router.navigate({ to: '/setup/2fa' });
        }}
        onLogin={() => router.navigate({ to: '/login' })}
      />
    );
  },
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  component: function ResetPasswordRoute() {
    // PasswordResetRequest manages its own sent/success state internally
    return (
      <PasswordResetRequest
        onSubmit={async (_email) => { /* Phase B: call API */ }}
        onBack={() => router.navigate({ to: '/login' })}
      />
    );
  },
});

const resetPasswordNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password/new',
  component: function ResetPasswordNewRoute() {
    return (
      <PasswordResetNew
        onSubmit={async (_password) => {
          await router.navigate({ to: '/login' });
        }}
        onLogin={() => router.navigate({ to: '/login' })}
      />
    );
  },
});

const totpSetupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/setup/2fa',
  component: function TOTPSetupRoute() {
    return (
      <TOTPSetup
        totpUri="otpauth://totp/Corredor:martin%40corredor.ar?secret=JBSWY3DPEHPK3PXP&issuer=Corredor"
        secretKey="JBSWY3DP EHPK3PXP"
        onVerify={async (_otp) => { /* Phase B: call API */ }}
        onComplete={() => router.navigate({ to: '/' })}
      />
    );
  },
});

// Index redirect
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/dashboard' });
  },
});

// Authenticated shell
const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated',
  component: AuthenticatedLayout,
});

const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/dashboard',
  component: function DashboardRoute() {
    return <DashboardPage userName={MOCK_USER.name} />;
  },
});

const propertiesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/properties',
  component: function PropertiesRoute() {
    return <PropertyListPage />;
  },
});

const contactsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/contacts',
  component: function ContactsRoute() {
    return <ContactsPage />;
  },
});

const leadsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/leads',
  component: function LeadsRoute() {
    return <LeadsPage />;
  },
});

const settingsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/settings',
  component: function SettingsRoute() {
    return (
      <SettingsPage>
        <Outlet />
      </SettingsPage>
    );
  },
});

const settingsIndexRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/settings/organization' });
  },
});

const organizationSettingsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/organization',
  component: function OrganizationSettingsRoute() {
    return (
      <OrganizationSettings
        initialData={MOCK_ORG}
        tenantSlug="inmobiliaria-del-centro"
        onSave={async (_data) => {
          // Phase B: POST to API
        }}
        onDeleteAccount={async () => {
          await router.navigate({ to: '/login' });
        }}
      />
    );
  },
});

// ─── Router tree ─────────────────────────────────────────────────────────────
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  resetPasswordRoute,
  resetPasswordNewRoute,
  totpSetupRoute,
  authenticatedRoute.addChildren([
    dashboardRoute,
    propertiesRoute,
    contactsRoute,
    leadsRoute,
    settingsRoute.addChildren([
      settingsIndexRoute,
      organizationSettingsRoute,
    ]),
  ]),
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// ─── Mount ───────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
