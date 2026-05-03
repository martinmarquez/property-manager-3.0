import { Phone, Mail, MessageCircle } from 'lucide-react';
import type { AgentBioProps } from '../lib/types';

export function AgentBio(props: AgentBioProps) {
  const { name, role, photoUrl, bio, phone, email, whatsapp } = props;

  return (
    <section className="site-section py-16 md:py-24">
      <div className="site-container max-w-3xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8 items-start p-6 md:p-8 rounded-site bg-surface-raised border border-divider">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={name}
              className="w-28 h-28 md:w-36 md:h-36 rounded-full object-cover flex-shrink-0 border-2 border-accent/30"
              loading="lazy"
            />
          ) : (
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-surface-elevated flex items-center justify-center flex-shrink-0 border-2 border-divider">
              <span className="font-display font-bold text-3xl text-ink-muted">
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <div className="flex-1 space-y-4">
            <div>
              <h3 className="site-heading text-xl md:text-2xl text-ink">{name}</h3>
              {role && (
                <p className="site-label mt-1">{role}</p>
              )}
            </div>

            {bio && (
              <p className="text-sm text-ink-muted leading-relaxed font-body">
                {bio}
              </p>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-site bg-surface-elevated text-ink-muted text-sm font-body hover:text-ink hover:bg-surface-base transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  {phone}
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-site bg-surface-elevated text-ink-muted text-sm font-body hover:text-ink hover:bg-surface-base transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  {email}
                </a>
              )}
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-site bg-accent/10 text-accent text-sm font-body hover:bg-accent/20 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
