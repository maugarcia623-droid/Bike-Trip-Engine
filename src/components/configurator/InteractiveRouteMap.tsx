import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { Plus, X, SpinnerGap, MapPin, Compass } from '@/components/icons';
import { reverseGeocodeLocation } from '../../services/locationService';
import { SurfaceBreakdown, SurfaceSegment } from '../../types/trip';
import { computeSurfaceBreakdown, SURFACE_VISUAL_META } from '../../utils/surfaceProfile';
import { useOsmSurface } from '../../services/osmSurfaceService';

export interface MapWaypoint {
  id: string;
  name: string;
  coordinates?: [number, number] | null;
  distanceFromStartKm?: number;
}

interface InteractiveRouteMapProps {
  originName: string;
  originCoords: [number, number] | null;
  destinationName: string;
  destCoords: [number, number] | null;
  waypoints: MapWaypoint[];
  coordinates?: [number, number][];
  distanceKm: number;
  surfaceBreakdown?: SurfaceBreakdown;
  activeSurfaceSegmentId?: string | null;
  onSelectSurfaceSegment?: (segment: SurfaceSegment | null) => void;
  onMapClickAddWaypoint: (coords: [number, number], reverseName?: string) => void;
  onRemoveWaypoint?: (id: string) => void;
  className?: string;
  isRouting?: boolean;
}

export const InteractiveRouteMap: React.FC<InteractiveRouteMapProps> = ({
  originName,
  originCoords,
  destinationName,
  destCoords,
  waypoints,
  coordinates,
  distanceKm,
  surfaceBreakdown: externalBreakdown,
  activeSurfaceSegmentId,
  onSelectSurfaceSegment,
  onMapClickAddWaypoint,
  onRemoveWaypoint,
  className = '',
  isRouting = false,
}) => {
  const { isDark } = useTheme();
  const { lang, t } = useTranslation();
  const isFr = lang === 'fr';

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const routeLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [isClickGeocoding, setIsClickGeocoding] = useState(false);
  const [lastAddedLabel, setLastAddedLabel] = useState<string | null>(null);
  const highlightLayerRef = useRef<L.FeatureGroup | null>(null);

  const canQueryFallbackOsm =
    !externalBreakdown && Boolean(coordinates && coordinates.length >= 2);
  const {
    osmData: fallbackOsmData,
    status: fallbackOsmStatus,
    error: fallbackOsmError,
  } = useOsmSurface(coordinates, distanceKm, canQueryFallbackOsm);

  const surfaceBreakdown = useMemo(
    () =>
      externalBreakdown ??
      computeSurfaceBreakdown(
        {
          origin: originName,
          destination: destinationName,
          distanceKm,
          coordinates,
          waypoints,
        },
        {
          osmData: fallbackOsmData,
          isLoadingOsm: canQueryFallbackOsm && fallbackOsmStatus === 'loading',
          osmError: fallbackOsmError,
        }
      ),
    [
      externalBreakdown,
      originName,
      destinationName,
      distanceKm,
      coordinates,
      waypoints,
      fallbackOsmData,
      canQueryFallbackOsm,
      fallbackOsmStatus,
      fallbackOsmError,
    ]
  );

  const getTileUrl = (dark: boolean) =>
    dark
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const defaultCenter: [number, number] = originCoords || [43.35, 6.2]; // Defaults near Provence / Côte d'Azur
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: true,
      doubleClickZoom: false,
    }).setView(defaultCenter, 9);

    mapInstanceRef.current = map;

    const tileLayer = L.tileLayer(getTileUrl(isDark), {
      maxZoom: 16,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    const routeGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);
    routeLayerGroupRef.current = routeGroup;
    markersLayerGroupRef.current = markersGroup;

    // Handle map click to add waypoint
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const clickedLat = e.latlng.lat;
      const clickedLng = e.latlng.lng;
      const coords: [number, number] = [
        Number(clickedLat.toFixed(5)),
        Number(clickedLng.toFixed(5)),
      ];

      setIsClickGeocoding(true);
      try {
        const placeName = await reverseGeocodeLocation(coords[0], coords[1], isFr ? 'fr' : 'en');
        setLastAddedLabel(placeName);
        setTimeout(() => setLastAddedLabel(null), 3500);
        onMapClickAddWaypoint(coords, placeName);
      } catch {
        onMapClickAddWaypoint(coords);
      } finally {
        setIsClickGeocoding(false);
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync dark mode tiles
  useEffect(() => {
    if (tileLayerRef.current) {
      tileLayerRef.current.setUrl(getTileUrl(isDark));
    }
  }, [isDark]);

  // Update Route Polylines and Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !routeLayerGroupRef.current || !markersLayerGroupRef.current) return;

    routeLayerGroupRef.current.clearLayers();
    markersLayerGroupRef.current.clearLayers();

    const bounds = L.latLngBounds([]);

    // 1. Draw Color-Coded Surface Polyline Segments
    if (coordinates && coordinates.length > 1) {
      // Road casing shadow
      L.polyline(coordinates, {
        color: isDark ? '#0B132B' : '#111111',
        weight: isDark ? 8 : 6.5,
        opacity: isDark ? 0.65 : 0.8,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(routeLayerGroupRef.current);

      for (const seg of surfaceBreakdown.segments) {
        if (!seg.coordinates || seg.coordinates.length < 2) continue;
        const meta = SURFACE_VISUAL_META[seg.type];
        const segLine = L.polyline(seg.coordinates, {
          color: isDark ? meta.colorDark : meta.colorLight,
          weight: seg.type === 'paved' ? 3.8 : 4.5,
          opacity: 0.96,
          dashArray: meta.dashArray,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(routeLayerGroupRef.current);

        segLine.bindTooltip(
          `<div style="font-family:ui-rounded,Nunito,sans-serif;font-size:11px;">
            <strong>${isFr ? seg.nameFr : seg.nameEn}</strong><br/>
            <span>km ${seg.startKm}–${seg.endKm} (${seg.distanceKm} km) · ${
              isFr ? meta.labelFr : meta.labelEn
            }</span>
          </div>`,
          { sticky: true, direction: 'top', offset: [0, -8] }
        );

        segLine.on('mouseover', () => onSelectSurfaceSegment?.(seg));
        segLine.on('mouseout', () => onSelectSurfaceSegment?.(null));
      }

      for (const pt of coordinates) {
        bounds.extend(pt);
      }
    }

    // Helper to build concentric styled Leaflet HTML marker
    const createMarkerIcon = (
      label: string,
      type: 'origin' | 'waypoint' | 'dest',
      title: string
    ) => {
      let bg = 'background:#10b981;color:#ffffff;border:2px solid #ffffff;'; // Green Origin
      if (type === 'waypoint') {
        bg = 'background:#F2F455;color:#111111;border:2px solid #111111;'; // Volt Waypoint
      } else if (type === 'dest') {
        bg = isDark
          ? 'background:#ffffff;color:#111111;border:2px solid #F2F455;'
          : 'background:#111111;color:#ffffff;border:2px solid #F2F455;'; // Finish Checkpoint
      }

      const html = `
        <div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;${bg}font-family:ui-rounded,SF Pro Rounded,Nunito,sans-serif;font-weight:800;font-size:12px;box-shadow:0 3px 10px rgba(0,0,0,0.35);cursor:pointer;transition:transform 0.15s ease;" title="${title}">
          ${label}
        </div>
      `;

      return L.divIcon({
        className: 'cadence-map-marker',
        html,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
      });
    };

    // 2. Start Marker (A)
    const effectiveOriginCoords = originCoords || (coordinates && coordinates.length > 0 ? coordinates[0] : null);
    if (effectiveOriginCoords) {
      bounds.extend(effectiveOriginCoords);
      const startMarker = L.marker(effectiveOriginCoords, {
        icon: createMarkerIcon('A', 'origin', originName || (isFr ? 'Départ' : 'Start')),
        zIndexOffset: 500,
      }).addTo(markersLayerGroupRef.current);

      startMarker.bindTooltip(
        `<div style="font-weight:700;font-size:11.5px;">${originName || (isFr ? 'Départ' : 'Start')}</div><div style="font-size:10px;color:#666;">${isFr ? 'Point de départ (A)' : 'Origin (A)'}</div>`,
        { direction: 'top', offset: [0, -14] }
      );
    }

    // 3. Intermediate Waypoint Markers (1, 2, 3...)
    waypoints.forEach((wp, idx) => {
      if (wp.coordinates) {
        bounds.extend(wp.coordinates);
        const markerLabel = String(idx + 1);
        const marker = L.marker(wp.coordinates, {
          icon: createMarkerIcon(markerLabel, 'waypoint', wp.name || `Via ${markerLabel}`),
          zIndexOffset: 600 + idx,
        }).addTo(markersLayerGroupRef.current!);

        // Popup with delete button
        const popupDiv = document.createElement('div');
        popupDiv.className = 'p-1 text-xs font-body text-ink';
        popupDiv.innerHTML = `
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:9999px;background:#F2F455;color:#111;font-weight:800;font-size:10px;">${idx + 1}</span>
            <span style="font-weight:700;font-size:12px;">${wp.name || (isFr ? `Arrêt ${idx + 1}` : `Stop ${idx + 1}`)}</span>
          </div>
          ${wp.distanceFromStartKm ? `<div style="font-size:11px;color:#888;margin-bottom:6px;">km ${wp.distanceFromStartKm}</div>` : ''}
          <div style="padding-top:4px;border-top:1px dashed rgba(0,0,0,0.1);">
            <button id="btn-del-wp-${wp.id}" style="background:#fee2e2;color:#991b1b;border:none;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              <span>${isFr ? 'Supprimer cet arrêt' : 'Remove stop'}</span>
            </button>
          </div>
        `;

        marker.bindPopup(popupDiv);
        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-del-wp-${wp.id}`);
          if (btn && onRemoveWaypoint) {
            btn.onclick = () => {
              marker.closePopup();
              onRemoveWaypoint(wp.id);
            };
          }
        });

        marker.bindTooltip(
          `<div style="font-weight:700;font-size:11.5px;">${wp.name || (isFr ? `Arrêt ${idx + 1}` : `Stop ${idx + 1}`)}</div>${wp.distanceFromStartKm ? `<div style="font-size:10px;color:#555;">km ${wp.distanceFromStartKm}</div>` : ''}`,
          { direction: 'top', offset: [0, -14] }
        );
      }
    });

    // 4. Finish Marker (B)
    const effectiveDestCoords = destCoords || (coordinates && coordinates.length > 1 ? coordinates[coordinates.length - 1] : null);
    if (effectiveDestCoords) {
      bounds.extend(effectiveDestCoords);
      const destMarker = L.marker(effectiveDestCoords, {
        icon: createMarkerIcon('B', 'dest', destinationName || (isFr ? 'Arrivée' : 'Finish')),
        zIndexOffset: 500,
      }).addTo(markersLayerGroupRef.current);

      destMarker.bindTooltip(
        `<div style="font-weight:700;font-size:11.5px;">${destinationName || (isFr ? 'Arrivée' : 'Finish')}</div><div style="font-size:10px;color:#666;">${isFr ? 'Destination (B)' : 'Finish (B)'}</div>`,
        { direction: 'top', offset: [0, -14] }
      );
    }

    // Auto-fit bounds if we have points
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
    }
  }, [coordinates, originCoords, destCoords, waypoints, originName, destinationName, isDark, isFr, surfaceBreakdown]);

  // Highlight active/hovered surface segment on map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (highlightLayerRef.current) {
      highlightLayerRef.current.remove();
      highlightLayerRef.current = null;
    }

    if (!activeSurfaceSegmentId) return;
    const seg = surfaceBreakdown.segments.find((s) => s.id === activeSurfaceSegmentId);
    if (!seg || !seg.coordinates || seg.coordinates.length < 2) return;

    const meta = SURFACE_VISUAL_META[seg.type];
    const outer = L.polyline(seg.coordinates, {
      color: isDark ? '#FFFFFF' : '#111111',
      weight: 9,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round',
    });
    const inner = L.polyline(seg.coordinates, {
      color: isDark ? meta.colorDark : meta.colorLight,
      weight: 5.5,
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round',
    });
    const fg = L.featureGroup([outer, inner]).addTo(map);
    highlightLayerRef.current = fg;

    return () => {
      fg.remove();
    };
  }, [activeSurfaceSegmentId, surfaceBreakdown.segments, isDark]);

  const handleResetFit = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const bounds = L.latLngBounds([]);
    if (coordinates && coordinates.length > 1) {
      coordinates.forEach((c) => bounds.extend(c));
    } else {
      if (originCoords) bounds.extend(originCoords);
      if (destCoords) bounds.extend(destCoords);
      waypoints.forEach((w) => {
        if (w.coordinates) bounds.extend(w.coordinates);
      });
    }
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
    }
  };

  return (
    <div className={`relative rounded-pod overflow-hidden ${className}`}>
      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className="w-full h-56 sm:h-72 cursor-crosshair z-0"
        title={t('clickMapToAddWaypointPrompt')}
      />

      {/* Top Floating Prompt & Click Banner (offset from top-left Leaflet zoom controls) */}
      <div className="absolute top-2.5 left-14 right-2.5 z-10 pointer-events-none flex items-center justify-between gap-2">
        <div className="pointer-events-auto bg-card/90 dark:bg-card/90 backdrop-blur-md px-2.5 py-1.5 rounded-full shadow-md flex items-center gap-2 text-[11px] text-ink font-medium max-w-[calc(100%-80px)] sm:max-w-none">
          <span className="w-2 h-2 rounded-full bg-volt ring-2 ring-volt/40 animate-pulse shrink-0" />
          <span className="leading-tight truncate">
            {isClickGeocoding
              ? isFr
                ? 'Localisation du point de passage…'
                : 'Resolving via-point…'
              : t('clickMapToAddWaypointPrompt')}
          </span>
        </div>

        {/* Fit Bounds Quick Button */}
        <button
          type="button"
          onClick={handleResetFit}
          className="pointer-events-auto bg-card/90 dark:bg-card/90 backdrop-blur-md min-h-[40px] px-3 py-1.5 rounded-full shadow-md text-[11px] font-semibold text-ink-secondary hover:text-ink hover:bg-card transition-all cursor-pointer flex items-center gap-1 shrink-0"
          title={isFr ? 'Recentrer sur l’itinéraire' : 'Fit route bounds'}
        >
          <Compass className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isFr ? 'Recentrer' : 'Recenter'}</span>
        </button>
      </div>

      {/* Bottom-Left Surface Color Legend Pill */}
      <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none flex items-center gap-1.5">
        <div className="pointer-events-auto bg-card/92 dark:bg-card/92 backdrop-blur-md px-2.5 py-1 rounded-full shadow-md flex items-center gap-2 text-[10.5px] font-rounded font-semibold text-ink tnum">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-500 dark:bg-sky-400" />
            <span>{surfaceBreakdown.pavedPct}% {isFr ? 'Bitume' : 'Paved'}</span>
          </span>
          <span className="opacity-35">·</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400" />
            <span>{surfaceBreakdown.gravelPct}% Gravel</span>
          </span>
          {surfaceBreakdown.singletrackPct > 0 && (
            <>
              <span className="opacity-35">·</span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 dark:bg-rose-400" />
                <span>{surfaceBreakdown.singletrackPct}% {isFr ? 'Sentier' : 'Trail'}</span>
              </span>
            </>
          )}
          <span className="opacity-35">·</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
              surfaceBreakdown.isLoadingOsm
                ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                : surfaceBreakdown.dataSource === 'osm-overpass'
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : 'bg-ink/8 dark:bg-white/10 text-ink-muted'
            }`}
          >
            {surfaceBreakdown.isLoadingOsm
              ? (isFr ? 'Analyse…' : 'Sync…')
              : surfaceBreakdown.dataSource === 'osm-overpass'
              ? (isFr ? 'Carte' : 'Map')
              : (isFr ? 'Est.' : 'Est.')}
          </span>
        </div>
      </div>

      {/* Bottom Floating Stats / Notification */}
      {(lastAddedLabel || isRouting) && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 pointer-events-none flex items-center justify-center">
          <div className="pointer-events-auto bg-[#111111]/90 text-white dark:bg-white/95 dark:text-[#111111] backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-lg text-xs font-semibold flex items-center gap-2 animate-apple-popover">
            {isRouting ? (
              <>
                <SpinnerGap className="w-3.5 h-3.5 animate-spin" />
                <span>{isFr ? 'Recalcul de l’itinéraire cyclable…' : 'Recomputing cycling route…'}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-volt" />
                <span>{t('mapClickWaypointAdded', { name: lastAddedLabel || '' })}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
