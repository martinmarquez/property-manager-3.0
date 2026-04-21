// Corredor CRM — UI Package
// shadcn components, tokens, theme
// Components added incrementally per module build
export { cn } from './utils.js';

// ── Styles ──────────────────────────────────────────────
// Import tokens in your app entry: import '@corredor/ui/styles/tokens.css'

// ── Auth ────────────────────────────────────────────────
export { LoginPage } from './components/auth/LoginPage.js';
export type { LoginPageProps } from './components/auth/LoginPage.js';

export { RegisterFlow } from './components/auth/RegisterFlow.js';
export type { RegisterFlowProps, RegisterFormData } from './components/auth/RegisterFlow.js';

export { PasswordResetRequest, PasswordResetNew } from './components/auth/PasswordReset.js';
export type { PasswordResetRequestProps, PasswordResetNewProps } from './components/auth/PasswordReset.js';

export { TOTPSetup } from './components/auth/TOTPSetup.js';
export type { TOTPSetupProps } from './components/auth/TOTPSetup.js';

// ── Layout ───────────────────────────────────────────────
export { AppShell } from './components/layout/AppShell.js';
export type { AppShellProps, AppShellUser, NavModule } from './components/layout/AppShell.js';

export { EmptyState, OnboardingChecklist } from './components/layout/EmptyState.js';
export type { EmptyStateProps, OnboardingChecklistProps, ChecklistItem } from './components/layout/EmptyState.js';

// ── Settings ─────────────────────────────────────────────
export { OrganizationSettings } from './components/settings/OrganizationSettings.js';
export type { OrganizationSettingsProps, OrganizationData } from './components/settings/OrganizationSettings.js';

// ── Common ───────────────────────────────────────────────
export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTableRow,
  SkeletonTable,
  SkeletonStatCard,
  DashboardSkeleton,
} from './components/common/Skeleton.js';
