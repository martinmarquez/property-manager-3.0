import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { resolveSite } from '../../lib/resolve-site';
import { getListings, getListingCount } from '../../lib/site-data';
import { ListingCard } from '../../blocks/shared/ListingCard';
import { translateOperation, translatePropertyType } from '../../lib/format';

export const revalidate = 60;

const PAGE_SIZE = 12;

const OPERATION_OPTIONS = [
  { value: '', label: 'Todas las operaciones' },
  { value: 'sale', label: 'Venta' },
  { value: 'rent', label: 'Alquiler' },
  { value: 'temp_rent', label: 'Alquiler temporal' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'apartment', label: 'Departamento' },
  { value: 'house', label: 'Casa' },
  { value: 'ph', label: 'PH' },
  { value: 'land', label: 'Terreno' },
  { value: 'office', label: 'Oficina' },
  { value: 'commercial', label: 'Local comercial' },
];

interface ListingPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata(): Promise<Metadata> {
  const siteData = await resolveSite();
  if (!siteData) return {};
  return {
    title: `Propiedades — ${siteData.name}`,
    description: `Explorá las propiedades disponibles en ${siteData.name}`,
  };
}

export default async function ListingFeedPage({ searchParams }: ListingPageProps): Promise<React.JSX.Element> {
  const siteData = await resolveSite();
  if (!siteData) notFound();

  const params = await searchParams;
  const operationFilter = typeof params.operacion === 'string' ? params.operacion : undefined;
  const propertyTypeFilter = typeof params.tipo === 'string' ? params.tipo : undefined;
  const localityFilter = typeof params.zona === 'string' ? params.zona : undefined;
  const currentPage = Math.max(1, parseInt(typeof params.pagina === 'string' ? params.pagina : '1', 10) || 1);

  const listOpts: Parameters<typeof getListings>[1] = {
    limit: PAGE_SIZE,
    offset: (currentPage - 1) * PAGE_SIZE,
  };
  const countOpts: Parameters<typeof getListingCount>[1] = {};
  if (operationFilter) { listOpts.operationFilter = operationFilter; countOpts.operationFilter = operationFilter; }
  if (propertyTypeFilter) { listOpts.propertyTypeFilter = propertyTypeFilter; countOpts.propertyTypeFilter = propertyTypeFilter; }
  if (localityFilter) { listOpts.localityFilter = localityFilter; countOpts.localityFilter = localityFilter; }

  const [listings, totalCount] = await Promise.all([
    getListings(siteData.tenantId, listOpts),
    getListingCount(siteData.tenantId, countOpts),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    if (operationFilter) p.set('operacion', operationFilter);
    if (propertyTypeFilter) p.set('tipo', propertyTypeFilter);
    if (localityFilter) p.set('zona', localityFilter);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const qs = p.toString();
    return `/propiedades${qs ? `?${qs}` : ''}`;
  }

  return (
    <main className="flex-1">
      <section className="site-section py-12 md:py-20">
        <div className="site-container">
          <div className="mb-10">
            <h1 className="site-heading text-3xl md:text-4xl text-ink">
              Propiedades
            </h1>
            <p className="text-ink-muted font-body mt-2">
              {totalCount} {totalCount === 1 ? 'propiedad encontrada' : 'propiedades encontradas'}
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-8 p-4 rounded-site bg-surface-raised border border-divider">
            <div className="flex items-center gap-2 text-ink-faint">
              <Search className="w-4 h-4" />
              <span className="site-label">Filtros</span>
            </div>

            <select
              defaultValue={operationFilter ?? ''}
              className="px-3 py-2 rounded-site bg-surface-base border border-divider text-ink text-sm font-body focus:outline-none focus:border-accent/60"
            >
              {OPERATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <select
              defaultValue={propertyTypeFilter ?? ''}
              className="px-3 py-2 rounded-site bg-surface-base border border-divider text-ink text-sm font-body focus:outline-none focus:border-accent/60"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {localityFilter && (
              <span className="px-3 py-2 rounded-site bg-accent-faint text-accent text-sm font-body border border-accent/20">
                {localityFilter}
              </span>
            )}
          </div>

          {/* Grid */}
          {listings.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-ink-muted font-body text-lg">
                No se encontraron propiedades con los filtros seleccionados.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-2 mt-12" aria-label="Paginación">
              {currentPage > 1 && (
                <a
                  href={buildUrl({ pagina: String(currentPage - 1) })}
                  className="flex items-center gap-1 px-4 py-2 rounded-site bg-surface-raised border border-divider text-ink-muted text-sm font-body hover:border-accent/40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </a>
              )}

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (currentPage <= 4) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = currentPage - 3 + i;
                  }

                  return (
                    <a
                      key={pageNum}
                      href={buildUrl({ pagina: String(pageNum) })}
                      className={`w-9 h-9 flex items-center justify-center rounded-site text-sm font-body transition-colors ${
                        pageNum === currentPage
                          ? 'bg-accent text-surface-base font-semibold'
                          : 'bg-surface-raised border border-divider text-ink-muted hover:border-accent/40'
                      }`}
                    >
                      {pageNum}
                    </a>
                  );
                })}
              </div>

              {currentPage < totalPages && (
                <a
                  href={buildUrl({ pagina: String(currentPage + 1) })}
                  className="flex items-center gap-1 px-4 py-2 rounded-site bg-surface-raised border border-divider text-ink-muted text-sm font-body hover:border-accent/40 transition-colors"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </a>
              )}
            </nav>
          )}
        </div>
      </section>
    </main>
  );
}
