import { initSentryBrowser, initPostHog } from '@corredor/telemetry/browser';
import React, { useState } from 'react';
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
import { PipelineKanbanPage } from './pages/pipelines/PipelineKanbanPage.js';
import { PipelineConfigPage } from './pages/pipelines/PipelineConfigPage.js';
import { PipelineFunnelPage } from './pages/pipelines/PipelineFunnelPage.js';
import { CalendarPage } from './pages/calendar/CalendarPage.js';
import { InquiryListPage } from './pages/inquiries/InquiryListPage.js';
import { InquiryDetailPage } from './pages/inquiries/InquiryDetailPage.js';
import SearchPage from './pages/search/SearchPage.js';
import CommandPalette from './components/search/CommandPalette.js';
import CopilotPage from './pages/copilot/CopilotPage.js';
import { TemplateEditorPage } from './pages/documents/TemplateEditorPage.js';
import { DocumentViewerPage } from './pages/documents/DocumentViewerPage.js';
import { ReservationListPage } from './pages/reservations/ReservationListPage.js';
import { ReservationDetailPage } from './pages/reservations/ReservationDetailPage.js';
import CopilotFloat from './components/copilot/CopilotFloat.js';
import { useCopilotEnabled } from './hooks/useCopilotEnabled.js';

// ─── Phase G: Site module ───────────────────────────────────────────────────
import SiteOverviewPage from './pages/site/SiteOverviewPage.js';
import SitePagesPage from './pages/site/SitePagesPage.js';
import SiteEditorPage from './pages/site/SiteEditorPage.js';
import SiteThemesPage from './pages/site/SiteThemesPage.js';
import SiteDomainsPage from './pages/site/SiteDomainsPage.js';
import SiteBlogPage from './pages/site/SiteBlogPage.js';
import SiteRedirectsPage from './pages/site/SiteRedirectsPage.js';
import SiteFormsPage from './pages/site/SiteFormsPage.js';
import SiteCreationWizard from './pages/site/SiteCreationWizard.js';
import BillingPage from './pages/settings/billing/BillingPage.js';

// ─── Phase G: Reports module ────────────────────────────────────────────────
import ReportsIndexPage from './pages/reports/ReportsIndexPage.js';
import FunnelConversionView from './pages/reports/views/FunnelConversionView.js';
import AgentProductivityView from './pages/reports/views/AgentProductivityView.js';
import ListingPerformanceView from './pages/reports/views/ListingPerformanceView.js';
import PortalROIView from './pages/reports/views/PortalROIView.js';
import PipelineVelocityView from './pages/reports/views/PipelineVelocityView.js';
import RevenueForecastView from './pages/reports/views/RevenueForecastView.js';
import RetentionCohortView from './pages/reports/views/RetentionCohortView.js';
import ZoneAnalysisView from './pages/reports/views/ZoneAnalysisView.js';
import AIUsageView from './pages/reports/views/AIUsageView.js';
import LeadCohortsView from './pages/reports/views/LeadCohortsView.js';
import SLAAdherenceView from './pages/reports/views/SLAAdherenceView.js';
import CommissionOwedView from './pages/reports/views/CommissionOwedView.js';
import InboxActivityView from './pages/reports/views/InboxActivityView.js';
import ClosingCalendarView from './pages/reports/views/ClosingCalendarView.js';
import PipelineByBranchView from './pages/reports/views/PipelineByBranchView.js';
import ReservationRatesView from './pages/reports/views/ReservationRatesView.js';
import DocumentExpiryView from './pages/reports/views/DocumentExpiryView.js';
import CapturedListingsView from './pages/reports/views/CapturedListingsView.js';
import InventoryBalanceView from './pages/reports/views/InventoryBalanceView.js';
import RevenueTrendView from './pages/reports/views/RevenueTrendView.js';
import PriceEvolutionView from './pages/reports/views/PriceEvolutionView.js';
import CustomerAcquisitionView from './pages/reports/views/CustomerAcquisitionView.js';

// ─── Phase G: Appraisals module ─────────────────────────────────────────────
import AppraisalsPage from './pages/appraisals/AppraisalsPage.js';
import AppraisalWizardPage from './pages/appraisals/AppraisalWizardPage.js';

// ─── Growth / Analytics dashboard ────────────────────────────────────────────
import { GrowthDashboardPage } from './pages/analytics/GrowthDashboardPage.js';

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

// ─── Root layout (wraps all authenticated routes) ─��──────────────────────────
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

function AuthenticatedLayout() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pathname = useRouterState({ select: s => s.location.pathname });
  const activeModule = pathToModule(pathname) as import('@corredor/ui').NavModule;

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
      }}
    >
      <Outlet />
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
        <a href="/" style={{ color: '#5577FF', textDecoration: 'none', fontSize: '0.875rem' }}>
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
const REPORT_VIEW_MAP: Record<string, React.ComponentType> = {
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

// ─── Router tree ────────────────────────────────���────────────────────────────
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
