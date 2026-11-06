import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../../context/ThemeContext';
import { DEFAULT_NANTES_ROUTE_COORDS } from './constants';

interface SchematicRouteMapProps {
  originLabel?: string;
  destinationLabel?: string;
  distanceKm?: number;
  estimatedMinutes?: number;
  coordinates?: [number, number][];
  className?: string;
  showLabels?: boolean;
}

export const SchematicRouteMap: React.FC<SchematicRouteMapProps> = ({
  originLabel = 'Trentemoult',
  destinationLabel = 'Nantes gare',
  distanceKm = 6.0,
  estimatedMinutes = 20,
  coordinates = DEFAULT_NANTES_ROUTE_COORDS,
  className = '',
  showLabels = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const { isDark } = useTheme();

  const activeCoords = coordinates && coordinates.length > 1 ? coordinates : DEFAULT_NANTES_ROUTE_COORDS;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Dispose existing map instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false,
        doubleClickZoom: false,
      });

      mapInstanceRef.current = map;

      const getTileUrl = (dark: boolean) =>
        dark
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
          : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

      const tileLayer = L.tileLayer(getTileUrl(isDark), {
        maxZoom: 16,
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      // Outer route casing line (soft glow)
      L.polyline(activeCoords, {
        color: isDark ? '#F2F455' : '#111111',
        weight: isDark ? 8 : 6,
        opacity: isDark ? 0.25 : 0.2,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // High-Contrast Core Route Line
      const routeLine = L.polyline(activeCoords, {
        color: isDark ? '#F2F455' : '#111111',
        weight: 3.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Waypoint A (Origin): White ring with dark/volt center
      const startCoord = activeCoords[0];
      const startMarker = L.circleMarker(startCoord, {
        radius: 6,
        fillColor: isDark ? '#111113' : '#FFFFFF',
        color: isDark ? '#F2F455' : '#111111',
        weight: 3,
        fillOpacity: 1,
      }).addTo(map);

      // Waypoint B (Destination): Solid dot
      const endCoord = activeCoords[activeCoords.length - 1];
      const endMarker = L.circleMarker(endCoord, {
        radius: 6.5,
        fillColor: isDark ? '#F2F455' : '#111111',
        color: isDark ? '#FFFFFF' : '#111111',
        weight: 2,
        fillOpacity: 1,
      }).addTo(map);

      // Fit map view bounds with ergonomic padding
      const bounds = routeLine.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [30, 30],
          maxZoom: 14,
        });
      }

      // Invalidate size once container settles
      const timer = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      };
    } catch (e) {
      console.warn('Map preview fallback to vector render', e);
    }
  }, [activeCoords, isDark]);

  return (
    <div className={`relative flex flex-col w-full overflow-hidden rounded-pod bg-pod border border-black/5 dark:border-white/10 ${className}`}>
      {/* Real Map Canvas Container */}
      <div className="relative w-full aspect-[16/10] sm:aspect-video bg-well/30 dark:bg-[#18181B] flex items-center justify-center overflow-hidden select-none">
        <div
          ref={mapContainerRef}
          className="absolute inset-0 w-full h-full z-0"
          aria-label={`Route map preview from ${originLabel} to ${destinationLabel}`}
        />

        {/* Waypoint Text Overlay A (Trentemoult) */}
        {showLabels && (
          <div className="absolute left-3 bottom-3 z-10 flex flex-col pointer-events-none bg-card/85 dark:bg-[#161618]/85 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-black/5 dark:border-white/10 shadow-2xs">
            <span className="text-[11px] sm:text-xs font-rounded font-bold text-ink tracking-tight flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full border-2 border-ink dark:border-volt bg-card inline-block"></span>
              A · {originLabel}
            </span>
            <span className="text-[9.5px] text-ink-muted leading-tight mt-0.5">
              Route preview · {distanceKm.toFixed(1)} km
            </span>
          </div>
        )}

        {/* Waypoint Text Overlay B (Nantes gare) */}
        {showLabels && (
          <div className="absolute right-3 top-3 z-10 flex items-center pointer-events-none bg-card/85 dark:bg-[#161618]/85 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-black/5 dark:border-white/10 shadow-2xs">
            <span className="text-[11px] sm:text-xs font-rounded font-bold text-ink tracking-tight flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-ink dark:bg-volt inline-block"></span>
              B · {destinationLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
