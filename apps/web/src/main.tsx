import { initSentryBrowser, initPostHog } from '@corredor/telemetry/browser';
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { createRouter, RouterProvider, createRootRoute, createRoute, Outlet, redirect, notFound } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { trpc, queryClient, makeTRPCReactClient } from './trpc.js';
import { I18nProvider } from './i18n/index.js';

// Design system tokens (Google Fonts + CSS custom properties)
import '@corredor/ui/styles/tokens.css';

import { useIntl, defineMessages } from 'react-intl';
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
  LeadsPage,
  SettingsPage,
} from './pages/StubPage.js';
import { ContactListPage } from './pages/contacts/ContactListPage.js';
import { ContactFormPage } from './pages/contacts/ContactFormPage.js';
import { ContactDetailPage } from './pages/contacts/ContactDetailPage.js';
import { DuplicatesPage } from './pages/contacts/DuplicatesPage.js';
import { SegmentBuilderPage } from './pages/contacts/SegmentBuilderPage.js';
import { PropertyListPage } from './pages/properties/PropertyListPage.js';
import { PropertyFormPage } from './pages/properties/PropertyFormPage.js';
import { OrganizationSettings } from '@corredor/ui';
import type { OrganizationData } from '@corredor/ui';
import { LocaleSwitcher } from './pages/settings/LocaleSwitcher.js';

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

const propertyNewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/properties/new',
  component: function PropertyNewRoute() {
    return <PropertyFormPage />;
  },
});

const propertyEditRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/properties/$propertyId/edit',
  component: function PropertyEditRoute() {
    const { propertyId } = propertyEditRoute.useParams();
    return <PropertyFormPage propertyId={propertyId} />;
  },
});

const contactsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/contacts',
  component: function ContactsRoute() {
    return <ContactListPage />;
  },
});

const contactNewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/contacts/new',
  component: function ContactNewRoute() {
    return <ContactFormPage />;
  },
});

const contactDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/contacts/$contactId',
  component: function ContactDetailRoute() {
    const { contactId } = contactDetailRoute.useParams();
    return <ContactDetailPage contactId={contactId} />;
  },
});

const contactEditRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/contacts/$contactId/edit',
  component: function ContactEditRoute() {
    const { contactId } = contactEditRoute.useParams();
    return <ContactFormPage contactId={contactId} />;
  },
});

const contactDuplicatesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/contacts/duplicates',
  component: function ContactDuplicatesRoute() {
    return <DuplicatesPage />;
  },
});

const contactSegmentsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/contacts/segments',
  component: function ContactSegmentsRoute() {
    return <SegmentBuilderPage />;
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
        <LocaleSwitcher />
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

const notFoundMessages = defineMessages({
  title:   { id: 'notFound.title' },
  message: { id: 'notFound.message' },
  back:    { id: 'notFound.back' },
});

// 404 catch-all
const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: function NotFoundRoute() {
    const intl = useIntl();
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#070D1A',
        color: '#EFF4FF',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        gap: '1rem',
      }}>
        <span style={{ fontSize: '4rem', fontWeight: 700, fontFamily: "'Syne', system-ui, sans-serif" }}>
          {intl.formatMessage(notFoundMessages.title)}
        </span>
        <p style={{ color: '#8DA0C0', margin: 0 }}>{intl.formatMessage(notFoundMessages.message)}</p>
        <a href="/" style={{ color: '#4669ff', textDecoration: 'none', fontSize: '0.875rem' }}>
          {intl.formatMessage(notFoundMessages.back)}
        </a>
      </div>
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
    propertyNewRoute,
    propertyEditRoute,
    contactsRoute,
    contactNewRoute,
    contactDetailRoute,
    contactEditRoute,
    contactDuplicatesRoute,
    contactSegmentsRoute,
    leadsRoute,
    settingsRoute.addChildren([
      settingsIndexRoute,
      organizationSettingsRoute,
    ]),
  ]),
  notFoundRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// ─── Root with providers ──────────────────────────────────────────────────────
function App() {
  const [trpcReactClient] = useState(() => makeTRPCReactClient());
  return (
    <I18nProvider>
      <trpc.Provider client={trpcReactClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </trpc.Provider>
    </I18nProvider>
  );
}

// ─── Mount ───────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
