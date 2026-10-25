import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation } from 'lucide-react';

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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const finalDestination = destinationName || gateName || 'Gate 17 (Saint-Nazaire)';
  const activeCoordinates = coordinates && coordinates.length > 0 ? coordinates : DEFAULT_CORRIDOR;

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

    // Listen for theme toggle to hot-swap map canvas tiles
    const observer = new MutationObserver(() => {
      const currentlyDark = document.documentElement.classList.contains('dark');
      if (tileLayerRef.current) {
        tileLayerRef.current.setUrl(getTileUrl(currentlyDark));
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const routeLine = L.polyline(activeCoordinates, {
      color: '#10b981',
      weight: 3.5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    L.polyline(activeCoordinates, {
      color: '#10b981',
      weight: 8,
      opacity: 0.25,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    const startIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `<div style="background-color: #10b981; width: 10px; height: 10px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 0 10px #10b981;"></div>`,
      iconSize: [10, 10],
      iconAnchor: [5, 5],
    });

    const endIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `<div style="background-color: #06b6d4; width: 10px; height: 10px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 0 10px #06b6d4;"></div>`,
      iconSize: [10, 10],
      iconAnchor: [5, 5],
    });

    if (activeCoordinates.length > 0) {
      L.marker(activeCoordinates[0], { icon: startIcon }).addTo(map);
      L.marker(activeCoordinates[activeCoordinates.length - 1], { icon: endIcon }).addTo(map);

      map.fitBounds(routeLine.getBounds(), {
        padding: [25, 25],
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
    <div className="flex-1 min-h-[340px] rounded-2xl bg-white dark:bg-[#0e0e11] border border-slate-200 dark:border-zinc-800 p-6 shadow-xs dark:shadow-xl flex flex-col justify-between overflow-hidden transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-zinc-800/80 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-emerald-600 dark:text-emerald-500">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              2D GEOGRAPHIC ROUTE BANNER
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              {originName} → {finalDestination} · {distanceKm} km cycling trace
            </p>
          </div>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="relative w-full flex-1 min-h-[220px] rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-950 my-3">
        <div ref={mapContainerRef} className="w-full h-full z-0 dark:[filter:brightness(0.85)_contrast(1.2)]" />

        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/90 dark:bg-zinc-900/90 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 backdrop-blur-xs flex items-center gap-1 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {originName}
          </span>
          <span className="text-slate-400 dark:text-zinc-500 text-xs">→</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/90 dark:bg-zinc-900/90 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 backdrop-blur-xs flex items-center gap-1 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            {finalDestination}
          </span>
        </div>

        <div className="absolute bottom-2.5 right-2.5 z-10">
          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-white/90 dark:bg-zinc-900/90 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60 backdrop-blur-xs shadow-2xs">
            Satellite Canvas &middot; Clean Slate
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] font-mono pt-3 border-t border-slate-100 dark:border-zinc-800/80 text-slate-500 dark:text-zinc-400 shrink-0">
        <span>Gravel Corridor · Active Track</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-bold">Scroll-lock active</span>
      </div>
    </div>
  );
};
