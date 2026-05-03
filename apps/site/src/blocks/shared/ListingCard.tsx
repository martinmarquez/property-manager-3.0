import { Bed, Bath, Maximize } from 'lucide-react';
import type { ListingCardData } from '../../lib/types';
import { formatPrice, formatArea, translatePropertyType, translateOperation } from '../../lib/format';

export function ListingCard({ listing }: { listing: ListingCardData }) {
  return (
    <a
      href={`/propiedades/${listing.id}`}
      className="group block rounded-site overflow-hidden bg-surface-raised border border-divider hover:border-accent/40 transition-all duration-200"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-elevated">
        {listing.thumbUrl ? (
          <img
            src={listing.thumbUrl}
            alt={listing.title ?? listing.referenceCode}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-faint">
            <Maximize className="w-10 h-10 opacity-30" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="site-label px-2 py-1 rounded-sm bg-accent/90 text-surface-base">
            {translateOperation(listing.operationKind)}
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-2">
        {listing.priceAmount && (
          <p className="font-display font-bold text-lg text-ink">
            {formatPrice(listing.priceAmount, listing.priceCurrency)}
          </p>
        )}

        <p className="text-sm text-ink-muted line-clamp-1 font-body">
          {listing.title ?? `${translatePropertyType(listing.propertyType)} — ${listing.referenceCode}`}
        </p>

        {listing.locality && (
          <p className="text-xs text-ink-faint font-body">
            {[listing.neighborhood, listing.locality].filter(Boolean).join(', ')}
          </p>
        )}

        <div className="flex items-center gap-4 mt-1 pt-3 border-t border-divider text-xs text-ink-muted">
          {listing.bedrooms != null && (
            <span className="flex items-center gap-1">
              <Bed className="w-3.5 h-3.5" />
              {listing.bedrooms}
            </span>
          )}
          {listing.bathrooms != null && (
            <span className="flex items-center gap-1">
              <Bath className="w-3.5 h-3.5" />
              {listing.bathrooms}
            </span>
          )}
          {listing.coveredAreaM2 != null && (
            <span className="flex items-center gap-1">
              <Maximize className="w-3.5 h-3.5" />
              {formatArea(listing.coveredAreaM2)}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
