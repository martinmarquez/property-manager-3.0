'use client';

import { useEffect, useRef, useState } from 'react';
import type { MapProps, ListingCardData } from '../lib/types';

interface MapBlockClientProps extends MapProps {
  listings?: Array<{
    id: string;
    title: string | null;
    lat: number;
    lng: number;
    thumbUrl?: string | null;
    priceLabel?: string;
  }>;
}

export function MapBlock(props: MapBlockClientProps) {
  const {
    center = [-34.6037, -58.3816],
    zoom = 12,
    height = '480px',
    listings = [],
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const maplibregl = await import('maplibre-gl');

      if (cancelled || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '&copy; OpenStreetMap contributors',
            },
          },
          layers: [
            {
              id: 'osm',
              type: 'raster',
              source: 'osm',
              minzoom: 0,
              maxzoom: 19,
            },
          ],
        },
        center: [center[1], center[0]],
        zoom,
        attributionControl: false,
      });

      map.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

      for (const listing of listings) {
        if (listing.lat == null || listing.lng == null) continue;

        const popupContent = document.createElement('div');
        popupContent.style.cssText = 'font-family:system-ui;font-size:13px;max-width:200px';

        const titleEl = document.createElement('strong');
        titleEl.textContent = listing.title ?? 'Propiedad';
        popupContent.appendChild(titleEl);

        if (listing.priceLabel) {
          popupContent.appendChild(document.createElement('br'));
          const priceEl = document.createElement('span');
          priceEl.style.color = '#666';
          priceEl.textContent = listing.priceLabel;
          popupContent.appendChild(priceEl);
        }

        const popup = new maplibregl.Popup({ offset: 25, closeButton: false })
          .setDOMContent(popupContent);

        new maplibregl.Marker({ color: 'var(--accent, #1654D9)' })
          .setLngLat([listing.lng, listing.lat])
          .setPopup(popup)
          .addTo(map);
      }

      if (listings.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        for (const l of listings) {
          if (l.lat != null && l.lng != null) bounds.extend([l.lng, l.lat]);
        }
        map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
      }

      mapRef.current = map;
      setLoaded(true);
    }

    init();
    return () => {
      cancelled = true;
      if (mapRef.current && typeof (mapRef.current as { remove?: () => void }).remove === 'function') {
        (mapRef.current as { remove: () => void }).remove();
      }
    };
  }, [center, zoom, listings]);

  return (
    <section className="site-section py-16 md:py-24">
      <div className="site-container">
        <div
          ref={containerRef}
          className="w-full rounded-site overflow-hidden border border-divider"
          style={{ height }}
        >
          {!loaded && (
            <div className="w-full h-full bg-surface-elevated flex items-center justify-center text-ink-faint text-sm">
              Cargando mapa…
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
