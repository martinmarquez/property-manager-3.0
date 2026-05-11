import React, { useEffect, useRef, useCallback } from 'react';
import type { PropertyRow } from '../../routes/properties/-types.js';

/* ─────────────────────────────────────────────────────────
   PropertyMap — MapLibre GL view for property list
   Lazy-loaded via React.lazy + Suspense from PropertyListPage.

   Features:
   - Clustered property markers (GeoJSON source + cluster layers)
   - Click cluster → zoom in
   - Click single marker → popup with property summary
   - Polygon draw toggle (free-hand / click-to-draw)
   - Clear polygon button
   - onPolygonChange callback → parent stores in filter.polygon
   ───────────────────────────────────────────────────────── */

const C = {
  bgBase:       '#070D1A',
  brand:        '#1654d9',
  brandLight:   '#5577FF',
  border:       '#1F2D48',
  textPrimary:  '#EFF4FF',
  textSecondary:'#8DA0C0',
  textTertiary: '#6B809E',
  bgRaised:     '#0D1526',
};

interface Coord { lng: number; lat: number }
type Polygon = Coord[];

interface PropertyMapProps {
  rows: PropertyRow[];
  isLoading: boolean;
  polygon?: Polygon | undefined;
  onPolygonChange?: (polygon: Polygon | undefined) => void;
  onCardClick: (id: string) => void;
}

/* ── MapLibre is a large bundle; dynamic import keeps it out of the main chunk. ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MapLibreMap = any;

const TILE_URL = 'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json';

const STATUS_COLORS: Record<string, string> = {
  active: '#18A659', reserved: '#F59E0B',
  sold: '#6B7FD7', paused: '#6B809E', archived: '#3A4E6A',
};

const OP_LABELS: Record<string, string> = {
  sale: 'Venta', rent: 'Alquiler', temp_rent: 'Alq. temp.',
  commercial_rent: 'Alq. com.', commercial_sale: 'Vta. com.',
};

function buildGeoJSON(rows: PropertyRow[]) {
  return {
    type: 'FeatureCollection' as const,
    features: rows
      .filter((r) => r.lat != null && r.lng != null)
      .map((r) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [r.lng!, r.lat!],
        },
        properties: {
          id: r.id,
          status: r.status,
          priceAmount: r.priceAmount,
          priceCurrency: r.priceCurrency,
          hasPricePublic: r.hasPricePublic,
          title: r.title,
          addressStreet: r.addressStreet,
          addressNumber: r.addressNumber,
          neighborhood: r.neighborhood,
          operationKind: r.operationKind,
          thumbUrl: r.thumbUrl,
          bedrooms: r.bedrooms,
          bathrooms: r.bathrooms,
          coveredAreaM2: r.coveredAreaM2,
          featured: r.featured,
          referenceCode: r.referenceCode,
          color: STATUS_COLORS[r.status] ?? '#6B809E',
        },
      })),
  };
}

function buildPolygonGeoJSON(polygon: Polygon) {
  const coords = polygon.map((p) => [p.lng, p.lat]);
  // Close the ring
  if (coords.length > 0) coords.push(coords[0]!);
  return {
    type: 'FeatureCollection' as const,
    features: [{
      type: 'Feature' as const,
      geometry: { type: 'Polygon' as const, coordinates: [coords] },
      properties: {},
    }],
  };
}

export function PropertyMap({ rows, isLoading, polygon, onPolygonChange, onCardClick }: PropertyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap>(null);
  const drawingRef = useRef(false);
  const drawPointsRef = useRef<Polygon>([]);
  const [drawMode, setDrawMode] = React.useState(false);
  const [mapReady, setMapReady] = React.useState(false);
  const [mapError, setMapError] = React.useState<string | null>(null);

  /* ── Init map ── */
  useEffect(() => {
    if (!containerRef.current) return;

    let map: MapLibreMap;
    let cancelled = false;

    import('maplibre-gl').then((ml) => {
      if (cancelled || !containerRef.current) return;
      const maplibregl = ml.default ?? ml;

      map = new maplibregl.Map({
        container: containerRef.current,
        style: TILE_URL,
        center: [-58.3816, -34.6037], // Buenos Aires
        zoom: 11,
        attributionControl: false,
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

      map.on('load', () => {
        if (cancelled) { map.remove(); return; }

        /* ── GeoJSON source ── */
        map.addSource('properties', {
          type: 'geojson',
          data: buildGeoJSON(rows),
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        /* ── Cluster circle ── */
        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'properties',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': C.brand,
            'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 100, 30],
            'circle-opacity': 0.85,
            'circle-stroke-width': 2,
            'circle-stroke-color': C.brandLight,
          },
        });

        /* ── Cluster count label ── */
        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'properties',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DM Sans Regular', 'Open Sans Regular', 'Arial Unicode MS Regular'],
            'text-size': 12,
          },
          paint: { 'text-color': '#ffffff' },
        });

        /* ── Individual marker ── */
        map.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'properties',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': 8,
            'circle-stroke-width': 2,
            'circle-stroke-color': C.bgRaised,
            'circle-opacity': 0.9,
          },
        });

        /* ── Polygon source ── */
        map.addSource('draw-polygon', {
          type: 'geojson',
          data: polygon ? buildPolygonGeoJSON(polygon) : { type: 'FeatureCollection', features: [] },
        });
        map.addLayer({
          id: 'draw-polygon-fill',
          type: 'fill',
          source: 'draw-polygon',
          paint: { 'fill-color': C.brandLight, 'fill-opacity': 0.12 },
        });
        map.addLayer({
          id: 'draw-polygon-line',
          type: 'line',
          source: 'draw-polygon',
          paint: { 'line-color': C.brandLight, 'line-width': 2, 'line-dasharray': [4, 2] },
        });

        /* ── Cluster click → zoom ── */
        map.on('click', 'clusters', (e: any) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
          if (!features.length) return;
          const clusterId = features[0].properties?.cluster_id;
          (map.getSource('properties') as any).getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
            if (err) return;
            map.easeTo({ center: features[0].geometry.coordinates, zoom });
          });
        });

        /* ── Single marker click → popup ── */
        map.on('click', 'unclustered-point', (e: any) => {
          const f = e.features?.[0];
          if (!f) return;
          const p = f.properties;
          const coords = f.geometry.coordinates.slice();
          const price = p.hasPricePublic && p.priceAmount
            ? `${p.priceCurrency === 'ARS' ? '$' : 'USD'} ${Number(p.priceAmount).toLocaleString('es-AR')}`
            : 'Sin precio';
          const addr = [p.addressStreet, p.addressNumber].filter(Boolean).join(' ') || '—';
          const details = [
            p.bedrooms != null && `${p.bedrooms} dorm.`,
            p.bathrooms != null && `${p.bathrooms} baños`,
            p.coveredAreaM2 != null && `${p.coveredAreaM2} m²`,
          ].filter(Boolean).join(' · ');

          const html = `
            <div style="font-family:'DM Sans',sans-serif;min-width:180px;cursor:pointer" data-id="${p.id}">
              ${p.thumbUrl ? `<img src="${p.thumbUrl}" alt="" style="width:100%;height:90px;object-fit:cover;border-radius:4px 4px 0 0;display:block;margin:-8px -8px 8px">` : ''}
              <div style="font-size:11px;color:${p.color};margin-bottom:4px;font-weight:500">
                ${p.operationKind ? OP_LABELS[p.operationKind] ?? p.operationKind : ''}
                ${p.referenceCode ? ` · ${p.referenceCode}` : ''}
              </div>
              <div style="font-size:14px;font-weight:600;color:#EFF4FF;margin-bottom:4px;font-family:'DM Mono',monospace">${price}</div>
              <div style="font-size:12px;color:#8DA0C0;margin-bottom:4px">${addr}</div>
              ${details ? `<div style="font-size:11px;color:#6B809E">${details}</div>` : ''}
            </div>`;

          const popup = new maplibregl.Popup({ offset: 12, closeButton: true, maxWidth: '220px' })
            .setLngLat(coords)
            .setHTML(html)
            .addTo(map);

          // Navigate on popup content click
          setTimeout(() => {
            const el = popup.getElement()?.querySelector('[data-id]') as HTMLElement | null;
            if (el) el.addEventListener('click', () => { popup.remove(); onCardClick(p.id); });
          }, 0);
        });

        /* ── Pointer cursors ── */
        map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });
        map.on('mouseenter', 'unclustered-point', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'unclustered-point', () => { map.getCanvas().style.cursor = ''; });

        mapRef.current = map;
        setMapReady(true);
      });

      map.on('error', (e: any) => {
        console.error('MapLibre error', e);
        setMapError('No se pudo cargar el mapa. Verificá tu conexión.');
      });
    }).catch((err) => {
      console.error('Failed to load maplibre-gl', err);
      setMapError('maplibre-gl no está instalado. Ejecutá: pnpm add maplibre-gl');
    });

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Update property data when rows change ── */
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const src = mapRef.current.getSource('properties');
    if (src) src.setData(buildGeoJSON(rows));
  }, [rows, mapReady]);

  /* ── Update polygon overlay ── */
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const src = mapRef.current.getSource('draw-polygon');
    if (!src) return;
    if (polygon && polygon.length >= 3) {
      src.setData(buildPolygonGeoJSON(polygon));
    } else {
      src.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [polygon, mapReady]);

  /* ── Draw mode mouse handlers ── */
  const handleMapMouseDown = useCallback((e: React.MouseEvent) => {
    if (!drawMode || !mapRef.current) return;
    drawingRef.current = true;
    drawPointsRef.current = [];
    e.preventDefault();
  }, [drawMode]);

  const handleMapMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drawMode || !drawingRef.current || !mapRef.current) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const ll = mapRef.current.unproject(point);
    drawPointsRef.current.push({ lng: ll.lng, lat: ll.lat });
    // Update polygon overlay in real-time
    const src = mapRef.current.getSource('draw-polygon');
    if (src && drawPointsRef.current.length >= 3) {
      src.setData(buildPolygonGeoJSON(drawPointsRef.current));
    }
  }, [drawMode]);

  const handleMapMouseUp = useCallback(() => {
    if (!drawMode || !drawingRef.current) return;
    drawingRef.current = false;
    if (drawPointsRef.current.length >= 3) {
      onPolygonChange?.(drawPointsRef.current);
    }
    setDrawMode(false);
  }, [drawMode, onPolygonChange]);

  const clearPolygon = useCallback(() => {
    drawPointsRef.current = [];
    onPolygonChange?.(undefined);
  }, [onPolygonChange]);

  if (mapError) {
    return (
      <div style={{
        height: 'calc(100vh - 110px)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
        color: C.textTertiary, fontSize: 14, background: C.bgBase,
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
          <line x1="8" y1="2" x2="8" y2="18"/>
          <line x1="16" y1="6" x2="16" y2="22"/>
        </svg>
        <p style={{ margin: 0 }}>{mapError}</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 110px)' }}>
      {/* Map container */}
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', cursor: drawMode ? 'crosshair' : 'grab' }}
        onMouseDown={handleMapMouseDown}
        onMouseMove={handleMapMouseMove}
        onMouseUp={handleMapMouseUp}
        onMouseLeave={handleMapMouseUp}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(7,13,26,0.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: C.textSecondary, fontSize: 14, pointerEvents: 'none',
        }}>
          Cargando propiedades…
        </div>
      )}

      {/* Map toolbar */}
      <div style={{
        position: 'absolute', top: 12, left: 12,
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        {/* Draw polygon */}
        <button
          onClick={() => setDrawMode((m) => !m)}
          title={drawMode ? 'Cancelar dibujo' : 'Dibujar zona de búsqueda'}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
            background: drawMode ? C.brand : C.bgRaised,
            border: `1px solid ${drawMode ? C.brandLight : C.border}`,
            color: drawMode ? '#fff' : C.textSecondary,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
          {drawMode ? 'Dibujando…' : 'Zona'}
        </button>

        {/* Clear polygon */}
        {polygon && polygon.length >= 3 && (
          <button
            onClick={clearPolygon}
            title="Eliminar zona de búsqueda"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 10px', borderRadius: 6, fontSize: 12,
              background: C.bgRaised,
              border: `1px solid ${C.border}`,
              color: '#EF4444',
              cursor: 'pointer',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Limpiar zona
          </button>
        )}

        {/* Marker count badge */}
        {rows.filter(r => r.lat != null).length > 0 && (
          <span style={{
            padding: '4px 10px', borderRadius: 6,
            background: 'rgba(7,13,26,0.75)', backdropFilter: 'blur(6px)',
            border: `1px solid ${C.border}`,
            fontSize: 11, color: C.textSecondary,
          }}>
            {rows.filter(r => r.lat != null).length} en mapa
          </span>
        )}
      </div>

      {/* Draw hint */}
      {drawMode && (
        <div style={{
          position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(7,13,26,0.85)', backdropFilter: 'blur(6px)',
          border: `1px solid ${C.border}`, borderRadius: 8,
          padding: '8px 16px', fontSize: 12, color: C.textSecondary,
          pointerEvents: 'none',
        }}>
          Mantenés presionado y arrastrás para dibujar la zona · Soltá para confirmar
        </div>
      )}
    </div>
  );
}
