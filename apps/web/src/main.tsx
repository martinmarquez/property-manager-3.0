import { initSentryBrowser, initPostHog } from '@corredor/telemetry/browser';
import React, { useState, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { createRouter, RouterProvider, createRootRoute, createRoute, Outlet, redirect, notFound, useRouterState } from '@tanstack/react-router';
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
  OrganizationSettings,
  MobileTabBar,
} from '@corredor/ui';
import type { AppShellUser, OrganizationData, MobileTab } from '@corredor/ui';

import { isNative } from './lib/capacitor.js';
import { initCapacitor } from './lib/capacitor-init.js';
import { usePushNotifications } from './hooks/usePushNotifications.js';
import { useAppLifecycle } from './hooks/useAppLifecycle.js';

// ─── Lazy-loaded page components ─────────────────────────────────────────────
// Helper: wrap a named export as a lazy default so React.lazy can consume it.
function lazyNamed<K extends string>(
  loader: () => Promise<Record<K, React.ComponentType<any>>>,
  key: K
): React.LazyExoticComponent<React.ComponentType<any>> {
  return React.lazy(() => loader().then(m => ({ default: m[key] })));
}

// Core pages
const DashboardPage       = lazyNamed(() => import('./pages/DashboardPage.js'), 'DashboardPage');
const LeadsPage           = lazyNamed(() => import('./pages/StubPage.js'), 'LeadsPage');
const SettingsPage        = lazyNamed(() => import('./pages/StubPage.js'), 'SettingsPage');
const LocaleSwitcher      = lazyNamed(() => import('./pages/settings/LocaleSwitcher.js'), 'LocaleSwitcher');
const BillingPage         = React.lazy(() => import('./pages/settings/billing/BillingPage.js'));

// Contacts
const ContactListPage     = lazyNamed(() => import('./pages/contacts/ContactListPage.js'), 'ContactListPage');
const ContactFormPage     = lazyNamed(() => import('./pages/contacts/ContactFormPage.js'), 'ContactFormPage');
const ContactDetailPage   = lazyNamed(() => import('./pages/contacts/ContactDetailPage.js'), 'ContactDetailPage');
const DuplicatesPage      = lazyNamed(() => import('./pages/contacts/DuplicatesPage.js'), 'DuplicatesPage');
const SegmentBuilderPage  = lazyNamed(() => import('./pages/contacts/SegmentBuilderPage.js'), 'SegmentBuilderPage');

// Properties
const PropertyListPage    = lazyNamed(() => import('./pages/properties/PropertyListPage.js'), 'PropertyListPage');
const PropertyFormPage    = lazyNamed(() => import('./pages/properties/PropertyFormPage.js'), 'PropertyFormPage');

// Pipelines
const PipelineKanbanPage  = lazyNamed(() => import('./pages/pipelines/PipelineKanbanPage.js'), 'PipelineKanbanPage');
const PipelineConfigPage  = lazyNamed(() => import('./pages/pipelines/PipelineConfigPage.js'), 'PipelineConfigPage');
const PipelineFunnelPage  = lazyNamed(() => import('./pages/pipelines/PipelineFunnelPage.js'), 'PipelineFunnelPage');

// Calendar
const CalendarPage        = lazyNamed(() => import('./pages/calendar/CalendarPage.js'), 'CalendarPage');

// Inquiries
const InquiryListPage     = lazyNamed(() => import('./pages/inquiries/InquiryListPage.js'), 'InquiryListPage');
const InquiryDetailPage   = lazyNamed(() => import('./pages/inquiries/InquiryDetailPage.js'), 'InquiryDetailPage');

// Search & copilot
const SearchPage          = React.lazy(() => import('./pages/search/SearchPage.js'));
const CommandPalette      = React.lazy(() => import('./components/search/CommandPalette.js'));
const CopilotPage         = React.lazy(() => import('./pages/copilot/CopilotPage.js'));
const CopilotFloat        = React.lazy(() => import('./components/copilot/CopilotFloat.js'));

// Documents
const TemplateEditorPage  = lazyNamed(() => import('./pages/documents/TemplateEditorPage.js'), 'TemplateEditorPage');
const DocumentViewerPage  = lazyNamed(() => import('./pages/documents/DocumentViewerPage.js'), 'DocumentViewerPage');

// Reservations
const ReservationListPage   = lazyNamed(() => import('./pages/reservations/ReservationListPage.js'), 'ReservationListPage');
const ReservationDetailPage = lazyNamed(() => import('./pages/reservations/ReservationDetailPage.js'), 'ReservationDetailPage');

// Site module
const SiteOverviewPage    = React.lazy(() => import('./pages/site/SiteOverviewPage.js'));
const SitePagesPage       = React.lazy(() => import('./pages/site/SitePagesPage.js'));
const SiteEditorPage      = React.lazy(() => import('./pages/site/SiteEditorPage.js'));
const SiteThemesPage      = React.lazy(() => import('./pages/site/SiteThemesPage.js'));
const SiteDomainsPage     = React.lazy(() => import('./pages/site/SiteDomainsPage.js'));
const SiteBlogPage        = React.lazy(() => import('./pages/site/SiteBlogPage.js'));
const SiteRedirectsPage   = React.lazy(() => import('./pages/site/SiteRedirectsPage.js'));
const SiteFormsPage       = React.lazy(() => import('./pages/site/SiteFormsPage.js'));
const SiteCreationWizard  = React.lazy(() => import('./pages/site/SiteCreationWizard.js'));

// Reports module — each view loaded on demand
const ReportsIndexPage          = React.lazy(() => import('./pages/reports/ReportsIndexPage.js'));
const FunnelConversionView      = React.lazy(() => import('./pages/reports/views/FunnelConversionView.js'));
const AgentProductivityView     = React.lazy(() => import('./pages/reports/views/AgentProductivityView.js'));
const ListingPerformanceView    = React.lazy(() => import('./pages/reports/views/ListingPerformanceView.js'));
const PortalROIView             = React.lazy(() => import('./pages/reports/views/PortalROIView.js'));
const PipelineVelocityView      = React.lazy(() => import('./pages/reports/views/PipelineVelocityView.js'));
const RevenueForecastView       = React.lazy(() => import('./pages/reports/views/RevenueForecastView.js'));
const RetentionCohortView       = React.lazy(() => import('./pages/reports/views/RetentionCohortView.js'));
const ZoneAnalysisView          = React.lazy(() => import('./pages/reports/views/ZoneAnalysisView.js'));
const AIUsageView               = React.lazy(() => import('./pages/reports/views/AIUsageView.js'));
const LeadCohortsView           = React.lazy(() => import('./pages/reports/views/LeadCohortsView.js'));
const SLAAdherenceView          = React.lazy(() => import('./pages/reports/views/SLAAdherenceView.js'));
const CommissionOwedView        = React.lazy(() => import('./pages/reports/views/CommissionOwedView.js'));
const InboxActivityView         = React.lazy(() => import('./pages/reports/views/InboxActivityView.js'));
const ClosingCalendarView       = React.lazy(() => import('./pages/reports/views/ClosingCalendarView.js'));
const PipelineByBranchView      = React.lazy(() => import('./pages/reports/views/PipelineByBranchView.js'));
const ReservationRatesView      = React.lazy(() => import('./pages/reports/views/ReservationRatesView.js'));
const DocumentExpiryView        = React.lazy(() => import('./pages/reports/views/DocumentExpiryView.js'));
const CapturedListingsView      = React.lazy(() => import('./pages/reports/views/CapturedListingsView.js'));
const InventoryBalanceView      = React.lazy(() => import('./pages/reports/views/InventoryBalanceView.js'));
const RevenueTrendView          = React.lazy(() => import('./pages/reports/views/RevenueTrendView.js'));
const PriceEvolutionView        = React.lazy(() => import('./pages/reports/views/PriceEvolutionView.js'));
const CustomerAcquisitionView   = React.lazy(() => import('./pages/reports/views/CustomerAcquisitionView.js'));

// Appraisals
const AppraisalsPage      = React.lazy(() => import('./pages/appraisals/AppraisalsPage.js'));
const AppraisalWizardPage = React.lazy(() => import('./pages/appraisals/AppraisalWizardPage.js'));

import { useCopilotEnabled } from './hooks/useCopilotEnabled.js';

// Initialize telemetry before rendering. Empty DSN/key in dev is safe — SDKs no-op.
initSentryBrowser({
  dsn: import.meta.env.VITE_SENTRY_DSN ?? '',
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_SENTRY_RELEASE,
  tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
});

// Defer analytics init to after first paint to avoid blocking LCP
if (typeof window !== 'undefined') {
  const initAnalytics = () => initPostHog({
    apiKey: import.meta.env.VITE_POSTHOG_KEY ?? '',
    host: import.meta.env.VITE_POSTHOG_HOST,
  });
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(initAnalytics);
  } else {
    setTimeout(initAnalytics, 1000);
  }
}

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

// ─── Suspense fallback ─────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }} />
  );
}

// ─── Root layout (wraps all authenticated routes) ─────────────────────────────
const MODULE_PATHS: Record<string, string> = {
  dashboard:    '/dashboard',
  properties:   '/properties',
  contacts:     '/contacts',
  leads:        '/leads',
  documents:    '/documents',
  reservations: '/reservations',
  calendar:     '/calendar',
  appraisals:   '/appraisals',
  site:         '/site',
  reports:      '/reports',
  settings:     '/settings',
};

function pathToModule(pathname: string): string {
  if (pathname.startsWith('/documents'))    return 'documents';
  if (pathname.startsWith('/reservations')) return 'reservations';
  if (pathname.startsWith('/properties'))   return 'properties';
  if (pathname.startsWith('/contacts'))     return 'contacts';
  if (pathname.startsWith('/leads') || pathname.startsWith('/pipelines')) return 'leads';
  if (pathname.startsWith('/calendar'))     return 'calendar';
  if (pathname.startsWith('/appraisals'))   return 'appraisals';
  if (pathname.startsWith('/site'))         return 'site';
  if (pathname.startsWith('/reports'))      return 'reports';
  if (pathname.startsWith('/settings'))     return 'settings';
  return 'dashboard';
}

const MOBILE_TAB_PATHS: Record<MobileTab, string> = {
  dashboard: '/dashboard',
  properties: '/properties',
  contacts: '/contacts',
  leads: '/pipelines',
  more: '/settings',
};

function pathToMobileTab(pathname: string): MobileTab {
  if (pathname.startsWith('/properties')) return 'properties';
  if (pathname.startsWith('/contacts')) return 'contacts';
  if (pathname.startsWith('/pipelines') || pathname.startsWith('/leads')) return 'leads';
  if (pathname.startsWith('/settings') || pathname.startsWith('/reports') || pathname.startsWith('/site')) return 'more';
  return 'dashboard';
}

function AuthenticatedLayout() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const pathname = useRouterState({ select: s => s.location.pathname });
  const activeModule = pathToModule(pathname) as import('@corredor/ui').NavModule;
  const native = isNative();

  usePushNotifications({
    onRegistered: (token) => {
      // TODO: call trpc.mobile.devices.register with token and platform
      console.debug('[push] registered:', token.slice(0, 8) + '...');
    },
    onNotificationTap: (deepLink) => {
      if (deepLink) router.navigate({ to: deepLink });
    },
  });

  useAppLifecycle({
    onResume: () => {
      // Refetch stale queries on app resume
      queryClient.invalidateQueries();
    },
  });

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(p => !p);
      }
    };
    const openHandler = () => setPaletteOpen(true);
    document.addEventListener('keydown', handler);
    document.addEventListener('open-command-palette', openHandler);
    return () => {
      document.removeEventListener('keydown', handler);
      document.removeEventListener('open-command-palette', openHandler);
    };
  }, []);

  return (
    <AppShell
      user={MOCK_USER}
      activeModule={activeModule}
      onNavigate={module => {
        const path = MODULE_PATHS[module];
        if (path) router.navigate({ to: path });
        setMobileDrawerOpen(false);
      }}
    >
      <div style={native ? { paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' } : undefined}>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          onNavigate={href => {
            setPaletteOpen(false);
            router.navigate({ to: href });
          }}
          onOpenSearchPage={(q, entityType) => {
            setPaletteOpen(false);
            router.navigate({ to: '/search', search: { q, type: entityType } });
          }}
        />
        <CopilotFloat />
      </Suspense>
      {native && (
        <MobileTabBar
          activeTab={pathToMobileTab(pathname)}
          onTabChange={tab => {
            if (tab === 'more') {
              setMobileDrawerOpen(prev => !prev);
            } else {
              const path = MOBILE_TAB_PATHS[tab];
              if (path) router.navigate({ to: path });
            }
          }}
        />
      )}
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

const propertyDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/properties/$propertyId',
  component: function PropertyDetailRoute() {
    const { propertyId } = propertyDetailRoute.useParams();
    return <PropertyFormPage propertyId={propertyId} />;
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

const billingSettingsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/billing',
  component: function BillingSettingsRoute() {
    return <BillingPage />;
  },
});

// ─── Pipelines routes ────────────────────────────────────────────────────────
const pipelinesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/pipelines',
  component: function PipelinesRoute() {
    return <PipelineKanbanPage />;
  },
});

const pipelineConfigRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/pipelines/config',
  component: function PipelineConfigRoute() {
    return <PipelineConfigPage />;
  },
});

const pipelineFunnelRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/pipelines/funnel',
  component: function PipelineFunnelRoute() {
    return <PipelineFunnelPage />;
  },
});

// ─── Calendar routes ─────────────────────────────────────────────────────────
const calendarRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/calendar',
  component: function CalendarRoute() {
    return <CalendarPage />;
  },
});

// ─── Inquiries routes ────────────────────────────────────────────────────────
const inquiriesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/inquiries',
  component: function InquiriesRoute() {
    return <InquiryListPage />;
  },
});

const inquiryDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/inquiries/$inquiryId',
  component: function InquiryDetailRoute() {
    const { inquiryId } = inquiryDetailRoute.useParams();
    return <InquiryDetailPage inquiryId={inquiryId} />;
  },
});

// ─── Search route ──────────────────────────────────────────────────────────
const searchRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/search',
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === 'string' ? search.q : '',
    type: typeof search.type === 'string' ? search.type : undefined,
  }),
  component: function SearchRoute() {
    const { q, type } = searchRoute.useSearch();
    return (
      <SearchPage
        initialQuery={q}
        initialEntityType={type as import('./hooks/useSearch.js').EntityType | undefined}
        onNavigate={href => router.navigate({ to: href })}
        onOpenPalette={() => document.dispatchEvent(new CustomEvent('open-command-palette'))}
      />
    );
  },
});

// ─── Copilot route ─────────────────────────────────────────────────────────
function CopilotRouteGuard() {
  const enabled = useCopilotEnabled();
  if (!enabled) {
    router.navigate({ to: '/dashboard' });
    return null;
  }
  return <CopilotPage />;
}

const copilotRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/copilot',
  component: CopilotRouteGuard,
});

// ─── Phase E: Documents routes ─────────────────────────────────────────────
const documentsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/documents',
  component: function DocumentsRoute() {
    return <TemplateEditorPage templateId="demo" />;
  },
});

const templateEditRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/documents/templates/$templateId/edit',
  component: function TemplateEditRoute() {
    const { templateId } = templateEditRoute.useParams();
    return <TemplateEditorPage templateId={templateId} />;
  },
});

const documentViewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/documents/$documentId',
  component: function DocumentViewRoute() {
    const { documentId } = documentViewRoute.useParams();
    return (
      <DocumentViewerPage
        documentId={documentId}
        onSendForSign={() => router.navigate({ to: '/documents/$documentId', params: { documentId } })}
      />
    );
  },
});

// ─── Phase E: Reservations routes ──────────────────────────────────────────
const reservationsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/reservations',
  component: function ReservationsRoute() {
    return <ReservationListPage />;
  },
});

const reservationDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/reservations/$reservationId',
  component: function ReservationDetailRoute() {
    const { reservationId } = reservationDetailRoute.useParams();
    return <ReservationDetailPage reservationId={reservationId} />;
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

// ─── Phase G: Site module routes ─────────────────────────────────────────────
const siteRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/site',
  component: function SiteRoute() {
    return <SiteOverviewPage />;
  },
});

const sitePagesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/site/pages',
  component: function SitePagesRoute() {
    return <SitePagesPage />;
  },
});

const siteEditorRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/site/editor/$pageId',
  component: function SiteEditorRoute() {
    return <SiteEditorPage />;
  },
});

const siteThemesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/site/themes',
  component: function SiteThemesRoute() {
    return <SiteThemesPage />;
  },
});

const siteDomainsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/site/domains',
  component: function SiteDomainsRoute() {
    return <SiteDomainsPage />;
  },
});

const siteBlogRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/site/blog',
  component: function SiteBlogRoute() {
    return <SiteBlogPage />;
  },
});

const siteRedirectsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/site/redirects',
  component: function SiteRedirectsRoute() {
    return <SiteRedirectsPage />;
  },
});

const siteFormSubmissionsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/site/form-submissions',
  component: function SiteFormSubmissionsRoute() {
    return <SiteFormsPage />;
  },
});

const siteNewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/site/new',
  component: function SiteNewRoute() {
    return <SiteCreationWizard />;
  },
});

// ─── Phase G: Reports routes ────────────────────────────────────────────────
const REPORT_VIEW_MAP: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  'funnel-conversion':    FunnelConversionView,
  'agent-productivity':   AgentProductivityView,
  'listing-performance':  ListingPerformanceView,
  'portal-roi':           PortalROIView,
  'pipeline-velocity':    PipelineVelocityView,
  'revenue-forecast':     RevenueForecastView,
  'retention-cohort':     RetentionCohortView,
  'zone-analysis':        ZoneAnalysisView,
  'ai-usage':             AIUsageView,
  'lead-cohorts':         LeadCohortsView,
  'sla-adherence':        SLAAdherenceView,
  'commission-owed':      CommissionOwedView,
  'inbox-activity':       InboxActivityView,
  'closing-calendar':     ClosingCalendarView,
  'pipeline-by-branch':   PipelineByBranchView,
  'reservation-rates':    ReservationRatesView,
  'document-expiry':      DocumentExpiryView,
  'captured-listings':    CapturedListingsView,
  'inventory-balance':    InventoryBalanceView,
  'revenue-trend':        RevenueTrendView,
  'price-evolution':      PriceEvolutionView,
  'customer-acquisition': CustomerAcquisitionView,
};

const reportsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/reports',
  component: function ReportsRoute() {
    return <ReportsIndexPage />;
  },
});

const reportViewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/reports/$slug',
  component: function ReportViewRoute() {
    const { slug } = reportViewRoute.useParams();
    const View = REPORT_VIEW_MAP[slug];
    if (!View) return <div style={{ padding: 40, textAlign: 'center' }}>Reporte no encontrado</div>;
    return <View />;
  },
});

// ─── Phase G: Appraisals routes ─────────────────────────────────────────────
const appraisalsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/appraisals',
  component: function AppraisalsRoute() {
    return <AppraisalsPage onNewAppraisal={() => router.navigate({ to: '/appraisals/new' })} />;
  },
});

const appraisalNewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/appraisals/new',
  component: function AppraisalNewRoute() {
    return <AppraisalWizardPage onClose={() => router.navigate({ to: '/appraisals' })} />;
  },
});

const appraisalEditRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/appraisals/$appraisalId',
  component: function AppraisalEditRoute() {
    const { appraisalId } = appraisalEditRoute.useParams();
    return <AppraisalWizardPage appraisalId={appraisalId} onClose={() => router.navigate({ to: '/appraisals' })} />;
  },
});

// ─── Router tree ────────────────────────────────────────────────────────────
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
    propertyDetailRoute,
    propertyEditRoute,
    contactsRoute,
    contactNewRoute,
    contactDetailRoute,
    contactEditRoute,
    contactDuplicatesRoute,
    contactSegmentsRoute,
    leadsRoute,
    pipelinesRoute,
    pipelineConfigRoute,
    pipelineFunnelRoute,
    calendarRoute,
    inquiriesRoute,
    inquiryDetailRoute,
    documentsRoute,
    templateEditRoute,
    documentViewRoute,
    reservationsRoute,
    reservationDetailRoute,
    siteRoute,
    sitePagesRoute,
    siteEditorRoute,
    siteThemesRoute,
    siteDomainsRoute,
    siteBlogRoute,
    siteRedirectsRoute,
    siteFormSubmissionsRoute,
    siteNewRoute,
    reportsRoute,
    reportViewRoute,
    appraisalsRoute,
    appraisalNewRoute,
    appraisalEditRoute,
    searchRoute,
    copilotRoute,
    settingsRoute.addChildren([
      settingsIndexRoute,
      organizationSettingsRoute,
      billingSettingsRoute,
    ]),
  ]),
  notFoundRoute,
]);

const router = createRouter({ routeTree });

initCapacitor(router);

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
