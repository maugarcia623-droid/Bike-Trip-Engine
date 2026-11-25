import React, { useEffect, useRef, useState, useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from "@/components/arc/button/button";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { Plus, X, SpinnerGap, MapPin, Compass, Maximize2, Minimize2 } from '@/components/icons';
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const highlightLayerRef = useRef<{ outer: L.Polyline; inner: L.Polyline } | null>(null);

  // Fullscreen: Escape key to exit, body scroll lock, nav suppression, and Leaflet resize
  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('cadence-map-fullscreen');
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove('cadence-map-fullscreen');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const timer = setTimeout(() => {
      map.invalidateSize({ animate: false });
    }, 50);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

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
      preferCanvas: false,
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

    const buildMarkerTooltip = (titleText: string, subtitleText?: string): HTMLElement => {
      const container = document.createElement('div');
      const titleEl = document.createElement('div');
      titleEl.style.cssText = 'font-weight:700;font-size:11.5px;';
      titleEl.textContent = titleText;
      container.appendChild(titleEl);
      if (subtitleText) {
        const subEl = document.createElement('div');
        subEl.style.cssText = 'font-size:10px;color:#666;';
        subEl.textContent = subtitleText;
        container.appendChild(subEl);
      }
      return container;
    };

    const buildSegmentTooltip = (name: string, detail: string): HTMLElement => {
      const container = document.createElement('div');
      container.style.cssText = 'font-family:ui-rounded,Nunito,sans-serif;font-size:11px;';
      const strong = document.createElement('strong');
      strong.textContent = name;
      container.appendChild(strong);
      container.appendChild(document.createElement('br'));
      const span = document.createElement('span');
      span.textContent = detail;
      container.appendChild(span);
      return container;
    };

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
          buildSegmentTooltip(
            isFr ? seg.nameFr : seg.nameEn,
            `km ${seg.startKm}–${seg.endKm} (${seg.distanceKm} km) · ${isFr ? meta.labelFr : meta.labelEn}`
          ),
          { sticky: true, direction: 'top', offset: [0, -8] }
        );

        segLine.on('mouseover', () => onSelectSurfaceSegment?.(seg));
        segLine.on('mouseout', () => onSelectSurfaceSegment?.(null));
      }
    }

    // Helper to build concentric styled Leaflet HTML marker safely via DOM
    const createMarkerIcon = (
      label: string,
      type: 'origin' | 'waypoint' | 'dest',
      title: string,
      anchorOffsetX = 0
    ) => {
      let bg = 'background:#10b981;color:#ffffff;border:2px solid #ffffff;'; // Green Origin
      if (type === 'waypoint') {
        bg = 'background:#F2F455;color:#111111;border:2px solid #111111;'; // Volt Waypoint
      } else if (type === 'dest') {
        bg = isDark
          ? 'background:#ffffff;color:#111111;border:2px solid #F2F455;'
          : 'background:#111111;color:#ffffff;border:2px solid #F2F455;'; // Finish Checkpoint
      }

      const el = document.createElement('div');
      el.style.cssText = `display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;${bg}font-family:ui-rounded,SF Pro Rounded,Nunito,sans-serif;font-weight:800;font-size:12px;box-shadow:0 3px 10px rgba(0,0,0,0.35);cursor:pointer;transition:transform 0.15s ease;`;
      el.title = title;
      el.textContent = label;

      return L.divIcon({
        className: 'cadence-map-marker',
        html: el,
        iconSize: [28, 28],
        iconAnchor: [14 + anchorOffsetX, 14],
        popupAnchor: [-anchorOffsetX, -14],
      });
    };

    const effectiveOriginCoords =
      originCoords || (coordinates && coordinates.length > 0 ? coordinates[0] : null);
    const effectiveDestCoords =
      destCoords || (coordinates && coordinates.length > 1 ? coordinates[coordinates.length - 1] : null);
    const isLoopOverlap = Boolean(
      effectiveOriginCoords &&
        effectiveDestCoords &&
        Math.hypot(
          effectiveOriginCoords[0] - effectiveDestCoords[0],
          effectiveOriginCoords[1] - effectiveDestCoords[1]
        ) < 0.0015
    );

    // 2. Start Marker (A)
    if (effectiveOriginCoords) {
      const originLabel = originName || (isFr ? 'Départ' : 'Start');
      const startMarker = L.marker(effectiveOriginCoords, {
        icon: createMarkerIcon('A', 'origin', originLabel, isLoopOverlap ? 12 : 0),
        zIndexOffset: 500,
      }).addTo(markersLayerGroupRef.current);

      startMarker.bindTooltip(
        buildMarkerTooltip(originLabel, isFr ? 'Point de départ (A)' : 'Origin (A)'),
        { direction: 'top', offset: [0, -14] }
      );
    }

    // 3. Intermediate Waypoint Markers (1, 2, 3...)
    waypoints.forEach((wp, idx) => {
      if (wp.coordinates) {
        const markerLabel = String(idx + 1);
        const wpLabel = wp.name || (isFr ? `Arrêt ${idx + 1}` : `Stop ${idx + 1}`);
        const marker = L.marker(wp.coordinates, {
          icon: createMarkerIcon(markerLabel, 'waypoint', wp.name || `Via ${markerLabel}`),
          zIndexOffset: 600 + idx,
        }).addTo(markersLayerGroupRef.current!);

        // Popup with delete button built via safe DOM nodes
        const popupDiv = document.createElement('div');
        popupDiv.className = 'p-1 text-xs font-body text-ink';

        const headerRow = document.createElement('div');
        headerRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px;';
        const badgeSpan = document.createElement('span');
        badgeSpan.style.cssText =
          'display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:9999px;background:#F2F455;color:#111;font-weight:800;font-size:10px;';
        badgeSpan.textContent = markerLabel;
        const nameSpan = document.createElement('span');
        nameSpan.style.cssText = 'font-weight:700;font-size:12px;';
        nameSpan.textContent = wpLabel;
        headerRow.appendChild(badgeSpan);
        headerRow.appendChild(nameSpan);
        popupDiv.appendChild(headerRow);

        if (wp.distanceFromStartKm) {
          const distDiv = document.createElement('div');
          distDiv.style.cssText = 'font-size:11px;color:#888;margin-bottom:6px;';
          distDiv.textContent = `km ${wp.distanceFromStartKm}`;
          popupDiv.appendChild(distDiv);
        }

        const actionRow = document.createElement('div');
        actionRow.style.cssText = 'padding-top:4px;border-top:1px dashed rgba(0,0,0,0.1);';
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.style.cssText =
          'background:#fee2e2;color:#991b1b;border:none;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;';

        const delIconSpan = document.createElement('span');
        delIconSpan.style.cssText = 'display:inline-flex;align-items:center;';
        delIconSpan.innerHTML = renderToStaticMarkup(
          <X size={11} strokeWidth={2.5} aria-hidden="true" />
        );
        delBtn.appendChild(delIconSpan);

        const btnLabel = document.createElement('span');
        btnLabel.textContent = isFr ? 'Supprimer cet arrêt' : 'Remove stop';
        delBtn.appendChild(btnLabel);

        if (onRemoveWaypoint) {
          delBtn.onclick = () => {
            marker.closePopup();
            onRemoveWaypoint(wp.id);
          };
        }

        actionRow.appendChild(delBtn);
        popupDiv.appendChild(actionRow);
        marker.bindPopup(popupDiv);

        marker.bindTooltip(
          buildMarkerTooltip(wpLabel, wp.distanceFromStartKm ? `km ${wp.distanceFromStartKm}` : undefined),
          { direction: 'top', offset: [0, -14] }
        );
      }
    });

    // 4. Finish Marker (B)
    if (effectiveDestCoords) {
      const destLabel = destinationName || (isFr ? 'Arrivée' : 'Finish');
      const destMarker = L.marker(effectiveDestCoords, {
        icon: createMarkerIcon('B', 'dest', destLabel, isLoopOverlap ? -12 : 0),
        zIndexOffset: 510,
      }).addTo(markersLayerGroupRef.current);

      destMarker.bindTooltip(
        buildMarkerTooltip(destLabel, isFr ? 'Destination (B)' : 'Finish (B)'),
        { direction: 'top', offset: [0, -14] }
      );
    }
  }, [coordinates, originCoords, destCoords, waypoints, originName, destinationName, isDark, isFr, surfaceBreakdown]);

  // Decouple auto-fit bounds from theme (isDark), surfaceBreakdown, and label updates
  const geometryKey = useMemo(() => {
    const coordKey =
      coordinates && coordinates.length > 0
        ? `${coordinates.length}:${coordinates.map((c) => `${c[0].toFixed(5)},${c[1].toFixed(5)}`).join(';')}`
        : '';
    const origKey = originCoords ? `${originCoords[0].toFixed(5)},${originCoords[1].toFixed(5)}` : '';
    const destKey = destCoords ? `${destCoords[0].toFixed(5)},${destCoords[1].toFixed(5)}` : '';
    const wpKey = waypoints
      .map((w) => (w.coordinates ? `${w.coordinates[0].toFixed(5)},${w.coordinates[1].toFixed(5)}` : ''))
      .join('|');
    return `${coordKey}#${origKey}#${destKey}#${wpKey}`;
  }, [coordinates, originCoords, destCoords, waypoints]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const bounds = L.latLngBounds([]);
    if (coordinates && coordinates.length > 0) {
      for (const pt of coordinates) {
        bounds.extend(pt);
      }
    }
    const effectiveOriginCoords = originCoords || (coordinates && coordinates.length > 0 ? coordinates[0] : null);
    if (effectiveOriginCoords) {
      bounds.extend(effectiveOriginCoords);
    }
    for (const wp of waypoints) {
      if (wp.coordinates) {
        bounds.extend(wp.coordinates);
      }
    }
    const effectiveDestCoords =
      destCoords || (coordinates && coordinates.length > 1 ? coordinates[coordinates.length - 1] : null);
    if (effectiveDestCoords) {
      bounds.extend(effectiveDestCoords);
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        paddingTopLeft: [48, 56],
        paddingBottomRight: [24, 60],
        maxZoom: 14,
      });
    }
  }, [geometryKey]);

  // Highlight active/hovered surface segment on map (reuse polylines to avoid layer thrashing)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const seg = activeSurfaceSegmentId
      ? surfaceBreakdown.segments.find((s) => s.id === activeSurfaceSegmentId)
      : undefined;

    if (!seg || !seg.coordinates || seg.coordinates.length < 2) {
      if (highlightLayerRef.current) {
        highlightLayerRef.current.outer.setLatLngs([]);
        highlightLayerRef.current.inner.setLatLngs([]);
      }
      return;
    }

    const meta = SURFACE_VISUAL_META[seg.type];
    const outerColor = isDark ? '#FFFFFF' : '#111111';
    const innerColor = isDark ? meta.colorDark : meta.colorLight;

    if (highlightLayerRef.current) {
      highlightLayerRef.current.outer.setLatLngs(seg.coordinates).setStyle({ color: outerColor });
      highlightLayerRef.current.inner.setLatLngs(seg.coordinates).setStyle({ color: innerColor });
    } else {
      const outer = L.polyline(seg.coordinates, {
        color: outerColor,
        weight: 9,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      const inner = L.polyline(seg.coordinates, {
        color: innerColor,
        weight: 5.5,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      highlightLayerRef.current = { outer, inner };
    }
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
      map.fitBounds(bounds, {
        paddingTopLeft: [48, 56],
        paddingBottomRight: [24, 60],
        maxZoom: 14,
      });
    }
  };

  return (
    <div
      data-map-fullscreen={isFullscreen ? 'true' : undefined}
      style={isFullscreen ? { zIndex: 1150 } : undefined}
      className={
        isFullscreen
          ? 'fixed inset-0 z-[1150] bg-card overflow-hidden'
          : `relative rounded-pod overflow-hidden ${className}`
      }
    >
      {/* Map Container */}
      <div className={isFullscreen ? 'w-full h-full' : 'w-full h-56 sm:h-72'}>
        <div
          ref={mapContainerRef}
          className="w-full h-full cursor-crosshair z-0 isolate"
          title={t('clickMapToAddWaypointPrompt')}
        />
      </div>

      {/* Top Floating Prompt & Click Banner (offset from top-left Leaflet zoom controls) */}
      <div
        className={`absolute z-20 pointer-events-none flex items-center justify-between gap-2 ${
          isFullscreen
            ? 'top-[calc(env(safe-area-inset-top,0px)+0.625rem)] left-[calc(env(safe-area-inset-left,0px)+3.5rem)] right-[calc(env(safe-area-inset-right,0px)+0.625rem)]'
            : 'top-2.5 left-14 right-2.5'
        }`}
      >
        <div className="pointer-events-auto bg-card/90 dark:bg-card/90 backdrop-blur-md px-2.5 py-1.5 rounded-full shadow-md flex items-center gap-2 text-[11px] text-ink font-medium max-w-[calc(100%-96px)] sm:max-w-none">
          <span className="w-2 h-2 rounded-full bg-volt ring-2 ring-volt/40 animate-pulse shrink-0" />
          <span className="leading-tight truncate">
            {isClickGeocoding ? (
              isFr ? (
                'Localisation du point de passage…'
              ) : (
                'Resolving via-point…'
              )
            ) : (
              <>
                <span className="sm:hidden">
                  {isFr ? 'Touchez pour un arrêt' : 'Tap map to add stop'}
                </span>
                <span className="hidden sm:inline">{t('clickMapToAddWaypointPrompt')}</span>
              </>
            )}
          </span>
        </div>

        {/* Fit Bounds & Fullscreen Quick Buttons */}
        <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
          <Button variant="ghost"
            type="button"
            onClick={handleResetFit}
            className="bg-card/90 dark:bg-card/90 backdrop-blur-md min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] px-3 py-1.5 rounded-full shadow-md text-[11px] font-semibold text-ink-secondary hover:text-ink hover:bg-card transition-all cursor-pointer flex items-center justify-center gap-1"
            title={isFr ? 'Recentrer sur l’itinéraire' : 'Fit route bounds'}
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isFr ? 'Recentrer' : 'Recenter'}</span>
          </Button>

          <Button variant="ghost"
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="bg-card/90 dark:bg-card/90 backdrop-blur-md min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] px-3 py-1.5 rounded-full shadow-md text-[11px] font-semibold text-ink-secondary hover:text-ink hover:bg-card transition-all cursor-pointer flex items-center justify-center gap-1"
            title={
              isFullscreen
                ? isFr
                  ? 'Quitter le plein écran (Échap)'
                  : 'Exit fullscreen (Esc)'
                : isFr
                ? 'Plein écran'
                : 'Fullscreen'
            }
            aria-label={
              isFullscreen
                ? isFr
                  ? 'Quitter le plein écran'
                  : 'Exit fullscreen'
                : isFr
                ? 'Plein écran'
                : 'Fullscreen'
            }
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isFr ? 'Réduire' : 'Exit'}</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isFr ? 'Plein écran' : 'Fullscreen'}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Bottom-Left Surface Color Legend Pill */}
      <div className="absolute bottom-2.5 left-2.5 z-20 pointer-events-none flex items-center gap-1.5">
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
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20 pointer-events-none flex items-center justify-center">
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
