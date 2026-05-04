'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { ThemeToggle } from './ThemeToggle';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { href: '/#features', key: 'product' },
  { href: '/precios', key: 'pricing' },
  { href: '/blog', key: 'blog' },
  { href: '/nosotros', key: 'about' },
] as const;

export function NavBar() {
  const t = useTranslations('nav');
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:80px;left:0;width:1px;height:1px';
    document.body.appendChild(el);
    const obs = new IntersectionObserver(
      ([e]) => setScrolled(!e.isIntersecting),
      { threshold: 1 }
    );
    obs.observe(el);
    return () => { obs.disconnect(); el.remove(); };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300
        ${scrolled ? 'glass-nav border-b border-border shadow-sm' : 'bg-transparent'}`}
    >
      <nav className="section-container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-display text-heading-sm text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">C</span>
          Corredor
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map(({ href, key }) => (
            <Link key={key} href={href} className="btn-ghost text-body-sm">
              {t(key)}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <Link href="https://app.corredor.ar/login" className="btn-ghost text-body-sm">
            {t('login')}
          </Link>
          <Link href="https://app.corredor.ar/register" className="btn-primary btn-sm">
            {t('cta')}
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setOpen(!open)}
            aria-label={open ? t('closeMenu') : t('menu')}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-subtle"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="glass-nav border-t border-border md:hidden">
          <div className="section-container flex flex-col gap-1 py-4">
            {navLinks.map(({ href, key }) => (
              <Link
                key={key}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-3 text-body-md text-ink hover:bg-surface-subtle"
              >
                {t(key)}
              </Link>
            ))}
            <hr className="my-2 border-border" />
            <Link
              href="https://app.corredor.ar/login"
              className="rounded-lg px-4 py-3 text-body-md text-ink-secondary hover:bg-surface-subtle"
            >
              {t('login')}
            </Link>
            <Link href="https://app.corredor.ar/register" className="btn-primary mt-2">
              {t('cta')}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
