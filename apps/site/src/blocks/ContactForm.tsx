'use client';

import { useState, type FormEvent } from 'react';
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { ContactFormProps } from '../lib/types';

const DEFAULT_FIELDS = ['nombre', 'email', 'telefono', 'mensaje'];

export function ContactForm(props: ContactFormProps & { siteId: string; pageId: string; blockId: string }) {
  const {
    title = 'Contactanos',
    subtitle,
    fields = DEFAULT_FIELDS,
    submitLabel = 'Enviar consulta',
    successMessage = '¡Gracias! Nos pondremos en contacto pronto.',
    siteId,
    pageId,
    blockId,
  } = props;

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState<Record<string, string>>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      let recaptchaToken: string | undefined;
      if (typeof window !== 'undefined' && 'grecaptcha' in window) {
        const grecaptcha = (window as unknown as Record<string, unknown>).grecaptcha as {
          execute: (key: string, opts: { action: string }) => Promise<string>;
        };
        const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
        if (siteKey) {
          recaptchaToken = await grecaptcha.execute(siteKey, { action: 'contact' });
        }
      }

      const res = await fetch('/api/public/form-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          pageId,
          blockId,
          data: formData,
          recaptchaToken,
        }),
      });

      if (!res.ok) throw new Error('submission failed');
      setStatus('success');
      setFormData({});
    } catch {
      setStatus('error');
    }
  };

  const fieldConfig: Record<string, { label: string; type: string; placeholder: string; multiline?: boolean }> = {
    nombre: { label: 'Nombre', type: 'text', placeholder: 'Tu nombre completo' },
    email: { label: 'Email', type: 'email', placeholder: 'tu@email.com' },
    telefono: { label: 'Teléfono', type: 'tel', placeholder: '+54 11 ...' },
    mensaje: { label: 'Mensaje', type: 'text', placeholder: '¿En qué podemos ayudarte?', multiline: true },
    propiedad: { label: 'Propiedad de interés', type: 'text', placeholder: 'Código o dirección de la propiedad' },
  };

  if (status === 'success') {
    return (
      <section className="site-section py-16 md:py-24">
        <div className="site-container max-w-xl mx-auto text-center">
          <div className="p-8 rounded-site bg-surface-raised border border-accent/30">
            <CheckCircle className="w-12 h-12 text-accent mx-auto mb-4" />
            <p className="text-lg text-ink font-display font-semibold">
              {successMessage}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="site-section py-16 md:py-24">
      <div className="site-container max-w-xl mx-auto">
        <div className="p-6 md:p-8 rounded-site bg-surface-raised border border-divider">
          {title && (
            <h2 className="site-heading text-2xl text-ink mb-1">{title}</h2>
          )}
          {subtitle && (
            <p className="text-sm text-ink-muted mb-6 font-body">{subtitle}</p>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {fields.map((fieldKey) => {
              const cfg = fieldConfig[fieldKey];
              if (!cfg) return null;

              const commonClasses =
                'w-full px-4 py-3 rounded-site bg-surface-base border border-divider text-ink text-sm font-body placeholder:text-ink-faint focus:outline-none focus:border-accent/60 transition-colors';

              return cfg.multiline ? (
                <div key={fieldKey}>
                  <label className="site-label mb-1.5 block">{cfg.label}</label>
                  <textarea
                    required
                    rows={4}
                    placeholder={cfg.placeholder}
                    className={`${commonClasses} resize-none`}
                    value={formData[fieldKey] ?? ''}
                    onChange={(e) =>
                      setFormData((d) => ({ ...d, [fieldKey]: e.target.value }))
                    }
                  />
                </div>
              ) : (
                <div key={fieldKey}>
                  <label className="site-label mb-1.5 block">{cfg.label}</label>
                  <input
                    required={fieldKey === 'email' || fieldKey === 'nombre'}
                    type={cfg.type}
                    placeholder={cfg.placeholder}
                    className={commonClasses}
                    value={formData[fieldKey] ?? ''}
                    onChange={(e) =>
                      setFormData((d) => ({ ...d, [fieldKey]: e.target.value }))
                    }
                  />
                </div>
              );
            })}

            {status === 'error' && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="w-4 h-4" />
                Error al enviar. Intentá de nuevo.
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-site bg-accent text-surface-base font-display font-semibold text-sm tracking-wide hover:bg-accent-hover transition-colors disabled:opacity-60"
            >
              {status === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {submitLabel}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
