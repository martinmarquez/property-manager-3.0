import { getListings } from '../lib/site-data';
import type { ListingGridProps, ListingCardData } from '../lib/types';
import { ListingCard } from './shared/ListingCard';

interface ListingGridServerProps extends ListingGridProps {
  tenantId: string;
}

export async function ListingGrid(props: ListingGridServerProps) {
  const {
    tenantId,
    title,
    operationFilter,
    propertyTypeFilter,
    localityFilter,
    limit = 6,
    columns = 3,
  } = props;

  const opts: Parameters<typeof getListings>[1] = { limit };
  if (operationFilter) opts.operationFilter = operationFilter;
  if (propertyTypeFilter) opts.propertyTypeFilter = propertyTypeFilter;
  if (localityFilter) opts.localityFilter = localityFilter;

  const listings = await getListings(tenantId, opts);

  const gridCols =
    columns === 2
      ? 'md:grid-cols-2'
      : columns === 4
        ? 'md:grid-cols-2 lg:grid-cols-4'
        : 'md:grid-cols-2 lg:grid-cols-3';

  return (
    <section className="site-section py-16 md:py-24">
      <div className="site-container">
        {title && (
          <div className="mb-10">
            <h2 className="site-heading text-2xl md:text-3xl text-ink">
              {title}
            </h2>
            <div className="mt-3 h-[2px] w-12 bg-accent rounded-full" />
          </div>
        )}

        {listings.length === 0 ? (
          <div className="text-center py-16 text-ink-muted font-body">
            No hay propiedades disponibles.
          </div>
        ) : (
          <div className={`grid grid-cols-1 ${gridCols} gap-5`}>
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
