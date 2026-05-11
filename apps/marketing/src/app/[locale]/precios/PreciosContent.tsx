'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { Check, Minus, ArrowRight, ChevronDown } from 'lucide-react';

const BNA_RATE = 1215;
const BNA_DATE = '11/05/2026';

interface Plan {
  key: string;
  priceUsd: number | null;
  popular?: boolean;
  cta: 'trial' | 'contact';
}

const plans: Plan[] = [
  { key: 'trial', priceUsd: 0, cta: 'trial' },
  { key: 'solo', priceUsd: 29, cta: 'trial' },
  { key: 'agency', priceUsd: 79, popular: true, cta: 'trial' },
  { key: 'pro', priceUsd: 149, cta: 'trial' },
  { key: 'enterprise', priceUsd: null, cta: 'contact' },
];

const comparisonFeatures = [
  'properties', 'leads', 'pipeline', 'inbox', 'copilot',
  'ownerPortal', 'billing', 'api', 'sla', 'migration',
];

type Availability = boolean | string;
const comparisonData: Record<string, Availability[]> = {
  properties: [true, true, true, true, true],
  leads: ['50', '200', true, true, true],
  pipeline: [true, true, true, true, true],
  inbox: [false, true, true, true, true],
  copilot: [false, false, true, true, true],
  ownerPortal: [false, false, true, true, true],
  billing: [false, false, true, true, true],
  api: [false, false, false, true, true],
  sla: [false, false, false, true, true],
  migration: [false, false, false, false, true],
};

const faqs = ['cancel', 'payment', 'migrate', 'support', 'trial'];

function formatPrice(usd: number, currency: 'usd' | 'ars'): string {
  if (usd === 0) return currency === 'usd' ? 'US$ 0' : 'ARS 0';
  if (currency === 'usd') return `US$ ${usd}`;
  const ars = Math.round(usd * BNA_RATE);
  return `ARS ${ars.toLocaleString('es-AR')}`;
}

export function PreciosContent() {
  const t = useTranslations('pricing');
  const [currency, setCurrency] = useState<'usd' | 'ars'>('ars');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <section className="relative overflow-hidden bg-dark-base pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="dot-grid absolute inset-0 opacity-30" />
        <div className="hero-glow absolute inset-0" />
        <div className="section-container relative text-center">
          <h1 className="font-display text-display-xl text-dark-text-primary opacity-0 animate-fade-up md:text-display-2xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-body-lg text-dark-text-secondary opacity-0 animate-fade-up delay-100">
            {t('subtitle')}
          </p>
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-dark-border bg-dark-raised p-1 opacity-0 animate-fade-up delay-200">
            <button
              onClick={() => setCurrency('ars')}
              className={`rounded-full px-4 py-2 text-body-sm font-medium transition-colors ${currency === 'ars' ? 'bg-brand-600 text-white' : 'text-dark-text-secondary hover:text-dark-text-primary'}`}
            >
              ARS
            </button>
            <button
              onClick={() => setCurrency('usd')}
              className={`rounded-full px-4 py-2 text-body-sm font-medium transition-colors ${currency === 'usd' ? 'bg-brand-600 text-white' : 'text-dark-text-secondary hover:text-dark-text-primary'}`}
            >
              USD
            </button>
          </div>
          {currency === 'ars' && (
            <p className="mt-3 text-body-xs text-dark-text-tertiary">
              {t('bnaRate', { rate: BNA_RATE.toLocaleString('es-AR'), date: BNA_DATE })}
            </p>
          )}
        </div>
      </section>

      <section className="section-padding -mt-8">
        <div className="section-container">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            {plans.map((plan) => (
              <div
                key={plan.key}
                className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-1 ${
                  plan.popular
                    ? 'border-brand-600 bg-surface-base shadow-brand dark:bg-dark-elevated'
                    : 'border-border bg-surface-base dark:border-dark-border dark:bg-dark-raised'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-body-xs font-semibold text-white">
                    {t('popular')}
                  </span>
                )}
                <h3 className="font-display text-heading-md text-ink">{t(`plans.${plan.key}.name`)}</h3>
                <p className="mt-2 text-body-sm text-ink-secondary flex-1">{t(`plans.${plan.key}.desc`)}</p>
                <div className="mt-4">
                  {plan.priceUsd !== null ? (
                    <>
                      <span className="font-display text-display-sm text-ink">{formatPrice(plan.priceUsd, currency)}</span>
                      {plan.priceUsd > 0 && <span className="text-body-sm text-ink-tertiary"> /{t('month')}</span>}
                    </>
                  ) : (
                    <span className="font-display text-heading-lg text-ink">{t('custom')}</span>
                  )}
                </div>
                <Link
                  href={plan.cta === 'trial' ? '/precios' : '/precios'}
                  className={`mt-6 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-body-sm font-medium transition-colors ${
                    plan.popular
                      ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand'
                      : 'border border-border text-ink hover:bg-surface-subtle dark:border-dark-border dark:hover:bg-dark-elevated'
                  }`}
                >
                  {plan.cta === 'trial' ? t('startTrial') : t('contactSales')}
                  <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-surface-subtle dark:bg-dark-raised">
        <div className="section-container">
          <h2 className="text-center font-display text-display-md text-ink">{t('comparison.title')}</h2>
          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead>
                <tr className="border-b border-border dark:border-dark-border">
                  <th className="py-4 pr-4 text-body-sm font-medium text-ink-tertiary">{t('comparison.feature')}</th>
                  {plans.map((plan) => (
                    <th key={plan.key} className="px-4 py-4 text-center text-body-sm font-medium text-ink">
                      {t(`plans.${plan.key}.name`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature) => (
                  <tr key={feature} className="border-b border-border/50 dark:border-dark-border/50">
                    <td className="py-3 pr-4 text-body-sm text-ink-secondary">{t(`comparison.features.${feature}`)}</td>
                    {comparisonData[feature].map((val, i) => (
                      <td key={i} className="px-4 py-3 text-center">
                        {val === true ? (
                          <Check size={18} className="mx-auto text-emerald-500" />
                        ) : val === false ? (
                          <Minus size={18} className="mx-auto text-ink-tertiary" />
                        ) : (
                          <span className="text-body-sm text-ink-secondary">{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="section-container">
          <h2 className="text-center font-display text-display-md text-ink">{t('faq.title')}</h2>
          <div className="mx-auto mt-10 max-w-prose flex flex-col gap-3">
            {faqs.map((faq, idx) => (
              <div key={faq} className="rounded-xl border border-border bg-surface-base dark:border-dark-border dark:bg-dark-raised">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                >
                  <span className="text-body-md font-medium text-ink">{t(`faq.items.${faq}.q`)}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-ink-tertiary transition-transform ${openFaq === idx ? 'rotate-180' : ''}`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-4">
                    <p className="text-body-sm text-ink-secondary leading-relaxed">{t(`faq.items.${faq}.a`)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
