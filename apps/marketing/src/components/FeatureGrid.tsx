import { useTranslations } from 'next-intl';
import {
  Building2, Users, Kanban, Inbox, CheckSquare, CalendarCheck,
  FileSignature, Receipt, UserCircle, UserCheck, BarChart3, Globe,
  Layout, FolderOpen, Sparkles, FileText, UsersRound, Plug,
} from 'lucide-react';

const modules = [
  { key: 'properties', icon: Building2, color: 'text-brand-500 bg-brand-faint' },
  { key: 'contacts', icon: Users, color: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10' },
  { key: 'pipeline', icon: Kanban, color: 'text-brand-500 bg-brand-faint' },
  { key: 'inbox', icon: Inbox, color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' },
  { key: 'tasks', icon: CheckSquare, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' },
  { key: 'showings', icon: CalendarCheck, color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10' },
  { key: 'contracts', icon: FileSignature, color: 'text-brand-500 bg-brand-faint' },
  { key: 'billing', icon: Receipt, color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' },
  { key: 'ownerPortal', icon: UserCircle, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-500/10' },
  { key: 'tenantPortal', icon: UserCheck, color: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10' },
  { key: 'analytics', icon: BarChart3, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' },
  { key: 'portals', icon: Globe, color: 'text-brand-500 bg-brand-faint' },
  { key: 'website', icon: Layout, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-500/10' },
  { key: 'documents', icon: FolderOpen, color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' },
  { key: 'copilot', icon: Sparkles, color: 'text-brand-500 bg-brand-faint' },
  { key: 'reports', icon: FileText, color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10' },
  { key: 'teams', icon: UsersRound, color: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10' },
  { key: 'integrations', icon: Plug, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' },
] as const;

export function FeatureGrid() {
  const t = useTranslations('features');

  return (
    <section id="features" className="section-padding">
      <div className="section-container">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex rounded-full border border-border bg-surface-subtle px-3 py-1 text-body-xs text-brand-600 dark:border-dark-border dark:bg-dark-raised dark:text-brand-400">
            {t('badge')}
          </span>
          <h2 className="mt-4 font-display text-display-lg text-ink">
            {t('title')}
          </h2>
          <p className="mt-4 text-body-lg text-ink-secondary">
            {t('subtitle')}
          </p>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(({ key, icon: Icon, color }) => (
            <div
              key={key}
              className="group rounded-xl border border-border bg-surface-base p-6
                         transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md
                         dark:border-dark-border dark:bg-dark-raised dark:hover:border-brand-400"
            >
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
                <Icon size={20} />
              </div>
              <h3 className="mt-4 font-body text-heading-sm text-ink">
                {t(`modules.${key}.title`)}
              </h3>
              <p className="mt-2 text-body-sm text-ink-secondary">
                {t(`modules.${key}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
