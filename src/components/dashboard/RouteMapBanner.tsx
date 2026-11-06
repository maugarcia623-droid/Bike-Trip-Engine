import React, { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from '../../context/LanguageContext';

interface RouteMapBannerProps {
  originName?: string;
  destinationName?: string;
  gateName?: string;
  distanceKm: number;
  coordinates?: [number, number][];
}

const DEFAULT_CORRIDOR: [number, number][] = [
  [47.2184, -1.5536],
  [47.2050, -1.6000],
  [47.2350, -1.7200],
  [47.2500, -1.8600],
  [47.2800, -2.0500],
  [47.2730, -2.1800],
  [47.2840, -2.2080],
];

export const RouteMapBanner: React.FC<RouteMapBannerProps> = ({
  originName = 'Nantes',
  destinationName,
  gateName,
  distanceKm = 22,
  coordinates = DEFAULT_CORRIDOR,
}) => {
  const { lang, t } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const defaultDest = lang === 'fr' ? 'Porte 17 (Saint-Nazaire)' : 'Gate 17 (Saint-Nazaire)';
  const finalDestination = destinationName || gateName || defaultDest;
  const activeCoordinates = useMemo(() => {
    return coordinates && coordinates.length > 0 ? coordinates : DEFAULT_CORRIDOR;
  }, [coordinates]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    const isDark = document.documentElement.classList.contains('dark');

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
    });

    mapInstanceRef.current = map;

    const getTileUrl = (dark: boolean) =>
      dark
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

    const tileLayer = L.tileLayer(getTileUrl(isDark), {
      maxZoom: 16,
      attribution: 'Esri, DeLorme, NAVTEQ',
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Road-casing & High-Vis Volt / Night-Beacon route lines
    const casingLine = L.polyline(activeCoordinates, {
      color: isDark ? '#F2F455' : '#111111',
      weight: isDark ? 8 : 6,
      opacity: isDark ? 0.22 : 0.92,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    const routeLine = L.polyline(activeCoordinates, {
      color: '#F2F455',
      weight: isDark ? 3.5 : 2.5,
      opacity: 1,
      dashArray: isDark ? undefined : '7, 6',
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    const observer = new MutationObserver(() => {
      const currentlyDark = document.documentElement.classList.contains('dark');
      if (tileLayerRef.current) {
        tileLayerRef.current.setUrl(getTileUrl(currentlyDark));
      }
      casingLine.setStyle({
        color: currentlyDark ? '#F2F455' : '#111111',
        weight: currentlyDark ? 8 : 6,
        opacity: currentlyDark ? 0.22 : 0.92,
      });
      routeLine.setStyle({
        color: '#F2F455',
        weight: currentlyDark ? 3.5 : 2.5,
        dashArray: currentlyDark ? undefined : '7, 6',
      });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const startIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `<div style="background-color: #CAF164; width: 12px; height: 12px; border-radius: 9999px; border: 2.5px solid #111111;"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });

    const endIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `<div style="background-color: #FF3B30; width: 12px; height: 12px; border-radius: 9999px; border: 2.5px solid #ffffff;"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });

    if (activeCoordinates.length > 0) {
      L.marker(activeCoordinates[0], { icon: startIcon }).addTo(map);
      L.marker(activeCoordinates[activeCoordinates.length - 1], { icon: endIcon }).addTo(map);

      map.fitBounds(routeLine.getBounds(), {
        padding: [28, 28],
        maxZoom: 13,
      });
    }

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [activeCoordinates]);

  return (
    <div className="flex-1 min-h-[340px] rounded-card bg-card text-ink p-4 flex flex-col justify-between overflow-hidden transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
        <div>
          <h2 className="text-base sm:text-[17px] font-semibold tracking-tight text-ink">
            {t('routeCorridorTitle')}
          </h2>
          <p className="text-[13px] text-ink-muted mt-0.5 tnum">
            {originName} → {finalDestination} &middot; {t('distanceTraceSub', { dist: distanceKm })}
          </p>
        </div>

        <span className="px-3 py-1 rounded-full bg-pod text-ink-secondary font-medium text-xs shrink-0">
          {t('activeTrackBadge')}
        </span>
      </div>

      {/* Map Canvas */}
      <div className="relative w-full flex-1 min-h-[235px] rounded-pod overflow-hidden bg-pod">
        <div
          ref={mapContainerRef}
          className="w-full h-full z-0 dark:[filter:brightness(0.84)_contrast(1.18)]"
        />

        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 flex-wrap">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-card text-ink shadow-xs flex items-center gap-1.5 border border-ink/10 dark:border-white/10">
            <span className="w-2 h-2 rounded-full bg-beacon-green dark:bg-volt-lime" />
            {originName}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-card text-ink shadow-xs flex items-center gap-1.5 border border-ink/10 dark:border-white/10">
            <span className="w-2 h-2 rounded-full bg-beacon-red" />
            {finalDestination}
          </span>
        </div>

        <div className="absolute bottom-3 right-3 z-10">
          <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-card text-ink-secondary shadow-xs border border-ink/10 dark:border-white/10">
            {t('scrollLockBadge')}
          </span>
        </div>
      </div>
    </div>
  );
};
