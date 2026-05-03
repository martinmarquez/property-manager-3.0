import type React from 'react';
import {
  Bed, Bath, Car, Maximize, Calendar, MapPin, Home,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { getListingById } from '../lib/site-data';
import { formatPrice, formatArea, translatePropertyType, translateOperation } from '../lib/format';
import type { ListingDetailProps } from '../lib/types';

interface ListingDetailServerProps extends ListingDetailProps {
  tenantId: string;
}

export async function ListingDetail(props: ListingDetailServerProps): Promise<React.JSX.Element> {
  const { tenantId, propertyId } = props;
  const listing = await getListingById(tenantId, propertyId);

  if (!listing) {
    return (
      <section className="site-section py-16">
        <div className="site-container text-center text-ink-muted">
          Propiedad no encontrada.
        </div>
      </section>
    );
  }

  const mainImage = listing.media[0];
  const stats = [
    listing.bedrooms != null && { icon: Bed, label: 'Dormitorios', value: listing.bedrooms },
    listing.bathrooms != null && { icon: Bath, label: 'Baños', value: listing.bathrooms },
    listing.garages != null && { icon: Car, label: 'Cocheras', value: listing.garages },
    listing.coveredAreaM2 != null && { icon: Maximize, label: 'Cubierta', value: formatArea(listing.coveredAreaM2) },
    listing.totalAreaM2 != null && { icon: Home, label: 'Total', value: formatArea(listing.totalAreaM2) },
    listing.ageYears != null && { icon: Calendar, label: 'Antigüedad', value: `${listing.ageYears} años` },
  ].filter(Boolean) as { icon: typeof Bed; label: string; value: string | number }[];

  return (
    <section className="site-section py-16 md:py-24">
      <div className="site-container">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Gallery */}
          <div className="lg:col-span-3 space-y-3">
            {mainImage && (
              <div className="relative aspect-[16/10] rounded-site overflow-hidden bg-surface-elevated">
                <img
                  src={mainImage.fullUrl ?? mainImage.mediumUrl ?? mainImage.thumbUrl ?? ''}
                  alt={listing.title ?? listing.referenceCode}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>
            )}
            {listing.media.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {listing.media.slice(1, 7).map((m) => (
                  <div
                    key={m.id}
                    className="flex-shrink-0 w-24 h-24 rounded-site overflow-hidden bg-surface-elevated"
                  >
                    <img
                      src={m.thumbUrl ?? m.mediumUrl ?? ''}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <p className="site-label mb-2">
                {translatePropertyType(listing.propertyType)} · {listing.referenceCode}
              </p>
              <h2 className="site-heading text-2xl md:text-3xl text-ink">
                {listing.title ?? translatePropertyType(listing.propertyType)}
              </h2>
              {listing.locality && (
                <p className="flex items-center gap-1.5 mt-2 text-sm text-ink-muted">
                  <MapPin className="w-4 h-4" />
                  {[listing.neighborhood, listing.locality].filter(Boolean).join(', ')}
                </p>
              )}
            </div>

            {listing.listings.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {listing.listings.map((l) => (
                  <div
                    key={l.kind}
                    className="px-4 py-3 rounded-site bg-accent-faint border border-accent/20"
                  >
                    <p className="site-label text-accent">{translateOperation(l.kind)}</p>
                    {l.priceAmount && (
                      <p className="font-display font-bold text-xl text-ink mt-1">
                        {formatPrice(l.priceAmount, l.priceCurrency)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {stats.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {stats.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex flex-col items-center p-3 rounded-site bg-surface-elevated text-center">
                    <Icon className="w-5 h-5 text-ink-muted mb-1.5" />
                    <span className="font-display font-bold text-ink text-sm">{value}</span>
                    <span className="text-[10px] text-ink-faint uppercase tracking-wider mt-0.5">{label}</span>
                  </div>
                ))}
              </div>
            )}

            {listing.description && (
              <div className="pt-4 border-t border-divider">
                <p className="site-label mb-3">Descripción</p>
                <div className="text-sm text-ink-muted leading-relaxed whitespace-pre-line font-body">
                  {listing.description}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
