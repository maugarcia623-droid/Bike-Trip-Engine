import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Check,
  Upload,
  Compass,
  SpinnerGap,
  MapPin,
  X,
  TrainSimple,
  Buildings,
  Plus,
  RotateCcw,
  ArrowsLeftRight,
} from '@/components/icons';
import { useTranslation } from '../../context/LanguageContext';
import { Button } from "@/components/arc/button/button";
import { ElevationProfilePoint, RouteWaypoint } from '../../types/trip';
import { SchematicRouteMap } from './SchematicRouteMap';
import { parseRouteFile } from '../../utils/routeFileParser';
import {
  calculateAutoBikeRoute,
  generateBikeLoopRoute,
  LoopShape,
} from '../../utils/routing';
import {
  LocationSuggestion,
  searchLocationSuggestions,
  POPULAR_CYCLING_HUBS,
} from '../../services/locationService';

interface RouteLocationInputProps {
  label: string;
  value: string;
  badgeLetter: 'A' | 'B';
  placeholder: string;
  biasCoords?: [number, number];
  onChange: (val: string) => void;
  onSelectSuggestion: (suggestion: LocationSuggestion) => void;
}

const EXTENDED_CYCLING_HUBS: LocationSuggestion[] = [
  {
    id: 'hub-annecy',
    name: 'Annecy, Le Pâquier',
    secondaryText: '74000 Annecy (Voie Verte du Lac)',
    fullDisplayName: 'Le Pâquier, 74000 Annecy, France',
    coordinates: [45.9012, 6.1319],
    type: 'city',
  },
  {
    id: 'hub-talloires',
    name: 'Talloires-Montmin',
    secondaryText: '74290 Talloires (Rive Est Lac d’Annecy)',
    fullDisplayName: 'Talloires-Montmin, 74290 France',
    coordinates: [45.8404, 6.2136],
    type: 'village',
  },
  {
    id: 'hub-lyon-confluence',
    name: 'Lyon Confluence',
    secondaryText: '69002 Lyon (Départ ViaRhôna)',
    fullDisplayName: 'Lyon Confluence, 69002 Lyon, France',
    coordinates: [45.7418, 4.818],
    type: 'city',
  },
  {
    id: 'hub-girona',
    name: 'Girona, Plaça Catalunya',
    secondaryText: '17001 Girona, Spain (Cycling Hub)',
    fullDisplayName: 'Plaça Catalunya, Girona, Spain',
    coordinates: [41.9818, 2.8237],
    type: 'city',
  },
  {
    id: 'hub-amsterdam',
    name: 'Amsterdam Centraal',
    secondaryText: '1012 AB Amsterdam, Netherlands (Station Hub)',
    fullDisplayName: 'Amsterdam Centraal, Netherlands',
    coordinates: [52.3791, 4.9003],
    type: 'station',
  },
  {
    id: 'hub-portland',
    name: 'Portland Waterfront',
    secondaryText: 'Tom McCall Waterfront Park, OR, USA',
    fullDisplayName: 'Portland Waterfront, Oregon, USA',
    coordinates: [45.5189, -122.6716],
    type: 'city',
  },
  ...POPULAR_CYCLING_HUBS,
];

const RouteLocationInput: React.FC<RouteLocationInputProps> = ({
  label,
  value,
  badgeLetter,
  placeholder,
  biasCoords,
  onChange,
  onSelectSuggestion,
}) => {
  const { lang } = useTranslation();
  const isFr = lang === 'fr';

  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  const biasLat = biasCoords?.[0];
  const biasLon = biasCoords?.[1];

  // Debounced search
  useEffect(() => {
    const trimmed = value.trim();

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const stableBias: [number, number] | undefined =
          biasLat !== undefined && biasLon !== undefined ? [biasLat, biasLon] : undefined;
        const results = await searchLocationSuggestions(trimmed, {
          lang: isFr ? 'fr' : 'en',
          biasCoords: stableBias,
          signal: controller.signal,
          limit: 6,
        });
        setSuggestions(results);
        setHighlightedIndex(-1);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [value, isFr, biasLat, biasLon]);

  const handleSelect = useCallback(
    (suggestion: LocationSuggestion) => {
      onSelectSuggestion(suggestion);
      setIsOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.blur();
    },
    [onSelectSuggestion]
  );

  const activeList = value.trim().length >= 2 ? suggestions : EXTENDED_CYCLING_HUBS;
  const showDropdown = isOpen && (activeList.length > 0 || isLoading);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) => (prev < activeList.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : activeList.length - 1));
      }
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < activeList.length) {
        e.preventDefault();
        handleSelect(activeList[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const getIconForType = (type?: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('station') || t.includes('gare') || t.includes('train')) {
      return <TrainSimple size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />;
    }
    if (t.includes('city') || t.includes('village') || t.includes('town')) {
      return <Compass size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />;
    }
    if (t.includes('building') || t.includes('gate') || t.includes('chateau')) {
      return <Buildings size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />;
    }
    return <MapPin size={14} className="text-ink-muted shrink-0" />;
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="block text-xs font-medium text-ink-secondary mb-1.5 font-body">
        {label}
      </label>

      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full min-h-[46px] px-3.5 pr-16 rounded-pod bg-card border border-black/15 dark:border-white/20 text-ink text-base sm:text-sm font-body focus:outline-none focus:ring-2 focus:ring-ink dark:focus:ring-white transition-all shadow-xs"
        />

        <div className="absolute right-3 flex items-center gap-1.5">
          {isLoading && (
            <SpinnerGap size={14} className="animate-spin text-ink-muted shrink-0" />
          )}

          {value.length > 0 && !isLoading && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onChange('');
                setIsOpen(true);
                inputRef.current?.focus();
              }}
              className="p-1 text-ink-muted hover:text-ink cursor-pointer"
              title={isFr ? 'Effacer' : 'Clear'}
            >
              <X size={13} />
            </Button>
          )}

          <span className="w-6 h-6 rounded-full bg-pod flex items-center justify-center text-xs font-rounded font-bold text-ink-muted border border-black/5 dark:border-white/10 pointer-events-none shrink-0">
            {badgeLetter}
          </span>
        </div>
      </div>

      {/* Floating Auto-Fill Suggestions Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-card rounded-pod border border-black/10 dark:border-white/15 shadow-xl overflow-hidden max-h-64 overflow-y-auto animate-apple-popover">
          <div className="px-3 py-1.5 bg-pod/60 border-b border-black/5 dark:border-white/10 text-[11px] font-rounded font-semibold text-ink-muted flex items-center justify-between">
            <span>
              {value.trim().length >= 2
                ? isFr ? 'Suggestions d’adresses' : 'Matching locations'
                : isFr ? 'Pôles cyclables suggérés' : 'Suggested cycling hubs'}
            </span>
            <span className="text-[9.5px] font-body lowercase text-ink-muted/80">
              {isFr ? '↑↓ pour naviguer' : '↑↓ to navigate'}
            </span>
          </div>

          <div className="p-1 space-y-0.5">
            {activeList.map((suggestion, index) => {
              const isHighlighted = highlightedIndex === index;
              return (
                <div
                  key={suggestion.id || `${suggestion.name}-${index}`}
                  onClick={() => handleSelect(suggestion)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`px-3 py-2 rounded-sub-pod cursor-pointer transition-colors flex items-center gap-2.5 ${
                    isHighlighted
                      ? 'bg-pod text-ink ring-1 ring-inset ring-black/5 dark:ring-white/10'
                      : 'hover:bg-pod/60 text-ink'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-card flex items-center justify-center border border-black/5 dark:border-white/10 shrink-0">
                    {getIconForType(suggestion.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-rounded font-bold text-ink truncate leading-tight">
                      {suggestion.name}
                    </div>
                    {suggestion.secondaryText && (
                      <div className="text-[11px] text-ink-muted font-body truncate leading-tight mt-0.5">
                        {suggestion.secondaryText}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

interface Screen3RouteProps {
  routeMode: 'from-to' | 'distance' | 'gpx';
  onChangeRouteMode: (mode: 'from-to' | 'distance' | 'gpx') => void;
  origin: string;
  destination: string;
  distanceKm: number;
  coordinates: [number, number][];
  waypoints?: RouteWaypoint[];
  isRouteReady: boolean;
  gpxFileName?: string;
  onUpdateOrigin: (val: string) => void;
  onUpdateDestination: (val: string) => void;
  onUpdateDistance: (km: number) => void;
  onUpdateCoordinates: (coords: [number, number][]) => void;
  onUpdateWaypoints?: (waypoints: RouteWaypoint[]) => void;
  onUpdateElevation?: (data: {
    elevationGainM?: number;
    elevationLossM?: number;
    elevationProfile?: ElevationProfilePoint[];
  }) => void;
  onGpxLoaded?: (parsed: { name: string; distanceKm: number; coordinates: [number, number][] }) => void;
}

const QUICK_HUBS = [
  {
    origin: 'Annecy, Le Pâquier',
    destination: 'Talloires-Montmin',
    label: 'Annecy → Talloires',
    coords: [
      [45.9012, 6.1319] as [number, number],
      [45.8404, 6.2136] as [number, number],
    ],
  },
  {
    origin: 'Lyon Confluence',
    destination: 'Vienne',
    label: 'Lyon → Vienne (ViaRhôna)',
    coords: [
      [45.7418, 4.818] as [number, number],
      [45.5245, 4.8753] as [number, number],
    ],
  },
  {
    origin: 'Girona, Plaça Catalunya',
    destination: 'Banyoles, Estany',
    label: 'Girona → Banyoles',
    coords: [
      [41.9818, 2.8237] as [number, number],
      [42.126, 2.7556] as [number, number],
    ],
  },
  {
    origin: 'Amsterdam Centraal',
    destination: 'Haarlem Grote Markt',
    label: 'Amsterdam → Haarlem',
    coords: [
      [52.3791, 4.9003] as [number, number],
      [52.3813, 4.6366] as [number, number],
    ],
  },
];

export const Screen3Route: React.FC<Screen3RouteProps> = ({
  routeMode,
  onChangeRouteMode,
  origin,
  destination,
  distanceKm,
  coordinates,
  waypoints,
  isRouteReady,
  gpxFileName,
  onUpdateOrigin,
  onUpdateDestination,
  onUpdateDistance,
  onUpdateCoordinates,
  onUpdateWaypoints,
  onUpdateElevation,
  onGpxLoaded,
}) => {
  const { lang } = useTranslation();
  const isFr = lang === 'fr';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [originCoords, setOriginCoords] = useState<[number, number] | null>(() =>
    origin.includes('Annecy') ? [45.9012, 6.1319] : null
  );
  const [destCoords, setDestCoords] = useState<[number, number] | null>(() =>
    destination.includes('Talloires') ? [45.8404, 6.2136] : null
  );
  const [intermediateStops, setIntermediateStops] = useState<
    Array<{ id: string; name: string; coords: [number, number] | null }>
  >(() => {
    if (waypoints && waypoints.length > 0) {
      return waypoints.map((w) => ({
        id: w.id,
        name: w.name,
        coords: w.coordinates || null,
      }));
    }
    return [];
  });

  const syncWaypointsToParent = useCallback(
    (stops: Array<{ id: string; name: string; coords: [number, number] | null }>) => {
      if (onUpdateWaypoints) {
        onUpdateWaypoints(
          stops
            .filter((s) => s.name.trim().length > 0)
            .map((s) => ({
              id: s.id,
              name: s.name.trim(),
              coordinates: s.coords || undefined,
            }))
        );
      }
    },
    [onUpdateWaypoints]
  );

  useEffect(() => {
    syncWaypointsToParent(intermediateStops);
  }, [intermediateStops, syncWaypointsToParent]);

  const [isFetchingDistance, setIsFetchingDistance] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchSuccessMessage, setFetchSuccessMessage] = useState<string | null>(null);
  const [loopShape, setLoopShape] = useState<LoopShape>('loop');
  const [loopBearingDeg, setLoopBearingDeg] = useState<number>(45);
  const [isGeneratingLoop, setIsGeneratingLoop] = useState(false);

  const handleGenerateLoop = async (
    shapeOverride: LoopShape = loopShape,
    bearingOverride: number = loopBearingDeg
  ) => {
    const cleanOrigin = origin.trim();
    if (!cleanOrigin && !originCoords) {
      setFetchError(
        isFr
          ? 'Veuillez saisir un point de départ pour tracer la boucle.'
          : 'Please enter a start location to build the loop.'
      );
      return;
    }

    setIsGeneratingLoop(true);
    setFetchError(null);
    setFetchSuccessMessage(null);

    try {
      const result = await generateBikeLoopRoute(cleanOrigin || 'Start', distanceKm, {
        originCoordsOverride: originCoords,
        shape: shapeOverride,
        bearingDeg: bearingOverride,
      });
      onUpdateDistance(Number(result.distanceKm.toFixed(1)));
      if (cleanOrigin) {
        onUpdateDestination(
          shapeOverride === 'out-and-back'
            ? `${cleanOrigin} (${isFr ? 'Aller-retour' : 'Out & Back'})`
            : `${cleanOrigin} (${isFr ? 'Boucle' : 'Loop'})`
        );
      }
      onUpdateCoordinates(result.coordinates);
      setOriginCoords(result.originCoordinates);
      setDestCoords(result.originCoordinates);
      onUpdateWaypoints?.([]);
      onUpdateElevation?.({
        elevationGainM: result.elevationGainM,
        elevationLossM: result.elevationLossM,
        elevationProfile: result.elevationProfile,
      });
      setFetchSuccessMessage(
        result.usedOfflineFallback
          ? isFr
            ? `Mode hors-ligne : boucle géométrique de ${result.distanceKm.toFixed(1)} km générée.`
            : `Offline fallback: ${result.distanceKm.toFixed(1)} km geometric loop created.`
          : isFr
          ? `${shapeOverride === 'out-and-back' ? 'Aller-retour' : 'Boucle vélo'} tracé : ${result.distanceKm.toFixed(1)} km (~${Math.round(result.estimatedMinutes)} min)`
          : `${shapeOverride === 'out-and-back' ? 'Out & back' : 'Bike loop'} routed: ${result.distanceKm.toFixed(1)} km (~${Math.round(result.estimatedMinutes)} min)`
      );
    } catch (err: any) {
      setFetchError(
        err?.message ||
          (isFr
            ? 'Impossible de générer la boucle vélo pour ce départ.'
            : 'Unable to generate a bike loop for that start point.')
      );
    } finally {
      setIsGeneratingLoop(false);
    }
  };

  const handleFetchDistance = async (
    originText = origin,
    destText = destination,
    stops = intermediateStops,
    originCoordsOverride: [number, number] | null = originCoords,
    destCoordsOverride: [number, number] | null = destCoords
  ) => {
    if (!originText.trim() || !destText.trim()) {
      setFetchError(
        isFr ? 'Veuillez renseigner le départ et l’arrivée.' : 'Please enter both origin and destination.'
      );
      return;
    }

    setIsFetchingDistance(true);
    setFetchError(null);
    setFetchSuccessMessage(null);

    try {
      const result = await calculateAutoBikeRoute(
        originText.trim(),
        destText.trim(),
        originCoordsOverride,
        destCoordsOverride,
        stops.map((s) => ({ id: s.id, name: s.name, coordinates: s.coords }))
      );
      if (result) {
        onUpdateDistance(Number(result.distanceKm.toFixed(1)));
        if (result.coordinates && result.coordinates.length > 1) {
          onUpdateCoordinates(result.coordinates);
          if (!originCoordsOverride) setOriginCoords(result.coordinates[0]);
          if (!destCoordsOverride) setDestCoords(result.coordinates[result.coordinates.length - 1]);
        }
        onUpdateElevation?.({
          elevationGainM: result.elevationGainM,
          elevationLossM: result.elevationLossM,
          elevationProfile: result.elevationProfile,
        });
        setFetchSuccessMessage(
          isFr
            ? `Itinéraire calculé : ${result.distanceKm.toFixed(1)} km (~${Math.round(result.estimatedMinutes)} min)`
            : `Route computed: ${result.distanceKm.toFixed(1)} km (~${Math.round(result.estimatedMinutes)} min)`
        );
      }
    } catch (err: any) {
      setFetchError(
        err.message ||
          (isFr ? 'Impossible de calculer la distance automatique.' : 'Unable to fetch automatic distance.')
      );
    } finally {
      setIsFetchingDistance(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseRouteFile(file);
      if (parsed && parsed.distanceKm > 0) {
        if (onGpxLoaded) {
          onGpxLoaded({
            name: file.name.replace(/\.(gpx|tcx|fit)$/i, ''),
            distanceKm: parsed.distanceKm,
            coordinates: parsed.coordinates || [],
          });
        }
      }
    } catch (err) {
      console.error('Failed to parse GPX', err);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col justify-between p-4 sm:p-8 md:p-10 pb-6 sm:pb-8 max-w-6xl mx-auto w-full">
      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start flex-1">
        {/* Left Column: Route Form */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="inline-flex items-center gap-2 text-xs font-rounded font-semibold text-ink-muted mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4D7C0F] dark:bg-volt" />
            <span>{isFr ? 'Parcours' : 'Route'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-rounded tracking-tight text-ink leading-tight mb-3">
            {isFr ? 'Où allez-vous rouler ?' : 'Where will you ride?'}
          </h2>

          <p className="text-sm text-ink-secondary mb-5 font-body">
            {isFr
              ? 'Indiquez départ et arrivée, fixez une distance cible ou importez un fichier GPX existant.'
              : 'Set your start and finish, build a distance loop, or bring a route you already have.'}
          </p>

          {/* Segmented Mode Switcher Tabs (Pill Shaped with Consistent Margins) */}
          <div
            role="tablist"
            aria-label={isFr ? 'Modes de planification' : 'Route planning modes'}
            className="grid grid-cols-3 p-1 gap-1 rounded-full bg-pod border border-black/5 dark:border-white/10 mb-5 text-xs font-rounded font-bold"
          >
            <Button
              type="button"
              variant="ghost"
              role="tab"
              aria-selected={routeMode === 'from-to'}
              onClick={() => onChangeRouteMode('from-to')}
              className={`min-h-[38px] py-1.5 px-2 sm:px-3 rounded-full transition-all cursor-pointer flex items-center justify-center text-center leading-tight select-none active:scale-[0.98] ${
                routeMode === 'from-to'
                  ? 'bg-card text-ink shadow-xs ring-1 ring-black/5 dark:ring-white/10 font-bold'
                  : 'text-ink-muted hover:text-ink hover:bg-card/40 font-medium'
              }`}
            >
              {isFr ? 'Départ / Arrivée' : 'From / to'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              role="tab"
              aria-selected={routeMode === 'distance'}
              onClick={() => onChangeRouteMode('distance')}
              className={`min-h-[38px] py-1.5 px-2 sm:px-3 rounded-full transition-all cursor-pointer flex items-center justify-center text-center leading-tight select-none active:scale-[0.98] ${
                routeMode === 'distance'
                  ? 'bg-card text-ink shadow-xs ring-1 ring-black/5 dark:ring-white/10 font-bold'
                  : 'text-ink-muted hover:text-ink hover:bg-card/40 font-medium'
              }`}
            >
              {isFr ? 'Départ + distance' : 'Start + distance'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              role="tab"
              aria-selected={routeMode === 'gpx'}
              onClick={() => onChangeRouteMode('gpx')}
              className={`min-h-[38px] py-1.5 px-2 sm:px-3 rounded-full transition-all cursor-pointer flex items-center justify-center text-center leading-tight select-none active:scale-[0.98] ${
                routeMode === 'gpx'
                  ? 'bg-card text-ink shadow-xs ring-1 ring-black/5 dark:ring-white/10 font-bold'
                  : 'text-ink-muted hover:text-ink hover:bg-card/40 font-medium'
              }`}
            >
              {isFr ? 'Importer un GPX' : 'Import GPX'}
            </Button>
          </div>

          {/* Mode 1: From / To Inputs with Auto-Fill Suggestions Dropdown */}
          {routeMode === 'from-to' && (
            <div className="space-y-4 mb-4">
              {/* Origin Auto-Fill Input */}
              <RouteLocationInput
                label={isFr ? 'Départ' : 'From'}
                value={origin}
                badgeLetter="A"
                biasCoords={destCoords || undefined}
                placeholder={isFr ? 'Ex: Annecy, Lyon ou tapez une ville' : 'e.g. Girona, Portland or type city'}
                onChange={(val) => {
                  onUpdateOrigin(val);
                  setOriginCoords(null);
                }}
                onSelectSuggestion={(s) => {
                  onUpdateOrigin(s.name);
                  const nextCoords = s.coordinates || null;
                  setOriginCoords(nextCoords);
                  if (destination.trim()) {
                    handleFetchDistance(s.name, destination, intermediateStops, nextCoords, destCoords);
                  }
                }}
              />

              {/* Intermediate Stops */}
              {intermediateStops.map((stop, idx) => (
                <div key={stop.id} className="flex items-center gap-2">
                  <div className="flex-1">
                    <RouteLocationInput
                      label={isFr ? `Étape intermédiaire ${idx + 1}` : `Via Stop ${idx + 1}`}
                      value={stop.name}
                      badgeLetter={String(idx + 1) as any}
                      biasCoords={originCoords || destCoords || undefined}
                      placeholder={isFr ? 'Ex: Point café, col, village…' : 'e.g. Coffee stop, climb, town…'}
                      onChange={(val) => {
                        setIntermediateStops((prev) =>
                          prev.map((s) => (s.id === stop.id ? { ...s, name: val, coords: null } : s))
                        );
                      }}
                      onSelectSuggestion={(s) => {
                        const next = intermediateStops.map((st) =>
                          st.id === stop.id
                            ? { ...st, name: s.name, coords: s.coordinates || null }
                            : st
                        );
                        setIntermediateStops(next);
                        if (origin.trim() && destination.trim()) {
                          handleFetchDistance(origin, destination, next);
                        }
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      const next = intermediateStops.filter((s) => s.id !== stop.id);
                      setIntermediateStops(next);
                      if (origin.trim() && destination.trim()) {
                        handleFetchDistance(origin, destination, next);
                      }
                    }}
                    className="mt-6 p-2 text-ink-muted hover:text-rose-500 cursor-pointer"
                    title={isFr ? 'Supprimer cet arrêt' : 'Remove stop'}
                  >
                    <X size={14} />
                  </Button>
                </div>
              ))}

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    const newId = `stop-${Date.now()}`;
                    setIntermediateStops((prev) => [...prev, { id: newId, name: '', coords: null }]);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-volt text-[#111111] text-xs font-rounded font-bold cursor-pointer transition-all hover:bg-volt-lime active:scale-95 shadow-xs"
                >
                  <Plus size={13} className="stroke-[2.5]" />
                  <span>{isFr ? 'Ajouter un arrêt intermédiaire' : 'Add intermediate stop'}</span>
                </Button>
              </div>

              {/* Destination Auto-Fill Input */}
              <RouteLocationInput
                label={isFr ? 'Arrivée' : 'To'}
                value={destination}
                badgeLetter="B"
                biasCoords={originCoords || undefined}
                placeholder={isFr ? 'Ex: Talloires, gare, lac ou sommet' : 'e.g. Lakeside Park, Banyoles or station'}
                onChange={(val) => {
                  onUpdateDestination(val);
                  setDestCoords(null);
                }}
                onSelectSuggestion={(s) => {
                  onUpdateDestination(s.name);
                  const nextCoords = s.coordinates || null;
                  setDestCoords(nextCoords);
                  if (origin.trim()) {
                    handleFetchDistance(origin, s.name, intermediateStops, originCoords, nextCoords);
                  }
                }}
              />

              {/* Auto-fill Quick Hubs Pills */}
              <div>
                <div className="text-[11px] font-medium text-ink-muted mb-1.5 font-body">
                  {isFr ? 'Suggestions d’itinéraires rapides :' : 'Quick auto-fill routes:'}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_HUBS.map((hub) => (
                    <Button
                      key={hub.label}
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        onUpdateOrigin(hub.origin);
                        onUpdateDestination(hub.destination);
                        if (hub.coords) {
                          setOriginCoords(hub.coords[0]);
                          setDestCoords(hub.coords[1]);
                        }
                        handleFetchDistance(
                          hub.origin,
                          hub.destination,
                          intermediateStops,
                          hub.coords?.[0] || null,
                          hub.coords?.[1] || null
                        );
                      }}
                      className="px-2.5 py-1 rounded-full text-[11px] font-rounded font-semibold bg-pod hover:bg-chip text-ink-secondary border border-black/5 dark:border-white/10 transition-colors cursor-pointer"
                    >
                      {hub.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Fetch Distance Button */}
              <div className="pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleFetchDistance()}
                  disabled={isFetchingDistance || !origin.trim() || !destination.trim()}
                  className="w-full sm:w-auto min-h-[42px] px-4 py-2 rounded-full border border-black/15 dark:border-white/20 bg-card hover:bg-pod text-ink text-xs font-rounded font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isFetchingDistance ? (
                    <SpinnerGap size={14} className="animate-spin text-current" />
                  ) : (
                    <Compass size={14} className="text-current" />
                  )}
                  <span>{isFr ? 'Calculer l’itinéraire & la distance' : 'Fetch distance & route'}</span>
                </Button>
              </div>

              {/* Feedback messages */}
              {fetchSuccessMessage && (
                <div className="p-2.5 rounded-pod bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-2">
                  <Check size={14} className="stroke-[3]" />
                  <span>{fetchSuccessMessage}</span>
                </div>
              )}

              {fetchError && (
                <div className="p-2.5 rounded-pod bg-amber-50 dark:bg-amber-950/30 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 font-medium">
                  {fetchError}
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Start + Distance Slider */}
          {routeMode === 'distance' && (
            <div className="space-y-4 mb-5">
              <RouteLocationInput
                label={isFr ? 'Point de départ' : 'Start location'}
                value={origin}
                badgeLetter="A"
                placeholder={isFr ? 'Lieu de départ' : 'Starting location'}
                onChange={(val) => {
                  onUpdateOrigin(val);
                  setOriginCoords(null);
                }}
                onSelectSuggestion={(s) => {
                  onUpdateOrigin(s.name);
                  if (s.coordinates) setOriginCoords(s.coordinates);
                }}
              />

              <div>
                <div className="flex items-center justify-between text-xs font-medium text-ink-secondary mb-2">
                  <span>{isFr ? 'Distance cible' : 'Target distance'}</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="2"
                      max="300"
                      step="1"
                      value={distanceKm}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          onUpdateDistance(Math.max(2, Math.min(300, val)));
                        }
                      }}
                      className="w-16 min-h-[40px] px-2 py-0.5 rounded-sub-pod bg-card text-ink font-rounded font-bold text-base sm:text-sm text-right tnum border border-black/15 dark:border-white/20 focus:outline-none focus:ring-2 focus:ring-volt"
                    />
                    <span className="font-rounded font-bold text-ink tnum text-sm">km</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="2"
                  max="250"
                  step="1"
                  value={distanceKm}
                  onChange={(e) => onUpdateDistance(Number(e.target.value))}
                  className="peloton-slider w-full cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-rounded text-ink-muted mt-1 tnum">
                  <span>2 km</span>
                  <span>50 km</span>
                  <span>100 km</span>
                  <span>150 km</span>
                  <span>200 km</span>
                  <span>250 km</span>
                </div>

                {/* Quick distance presets + loop shape */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1 p-1 rounded-full bg-pod border border-black/5 dark:border-white/10">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setLoopShape('loop')}
                      className={`h-7 px-2.5 rounded-full text-[11px] font-rounded font-bold inline-flex items-center gap-1 transition-all cursor-pointer ${
                        loopShape === 'loop'
                          ? 'bg-card text-ink shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{isFr ? 'Boucle' : 'Circular Loop'}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setLoopShape('out-and-back')}
                      className={`h-7 px-2.5 rounded-full text-[11px] font-rounded font-bold inline-flex items-center gap-1 transition-all cursor-pointer ${
                        loopShape === 'out-and-back'
                          ? 'bg-card text-ink shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      <ArrowsLeftRight className="w-3 h-3" />
                      <span>{isFr ? 'Aller-retour' : 'Out & Back'}</span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    {[25, 50, 80, 120].map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        variant="ghost"
                        onClick={() => onUpdateDistance(preset)}
                        className={`h-7 px-2 rounded-full text-[11px] font-rounded font-bold tnum transition-colors cursor-pointer ${
                          Math.round(distanceKm) === preset
                            ? 'bg-ink text-ink-inverse'
                            : 'bg-pod text-ink-secondary hover:bg-chip'
                        }`}
                      >
                        {preset}k
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Real OSRM Loop Generation CTA */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleGenerateLoop(loopShape, loopBearingDeg)}
                    disabled={isGeneratingLoop || (!origin.trim() && !originCoords)}
                    className="h-10 px-4 rounded-full bg-pod hover:bg-chip text-xs font-rounded font-bold text-ink border border-black/10 dark:border-white/15 inline-flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isGeneratingLoop ? (
                      <>
                        <SpinnerGap className="w-3.5 h-3.5 animate-spin" />
                        <span>{isFr ? 'Traçage de la boucle…' : 'Routing bike loop…'}</span>
                      </>
                    ) : (
                      <>
                        <Compass className="w-3.5 h-3.5 text-ink" />
                        <span>
                          {loopShape === 'out-and-back'
                            ? isFr
                              ? 'Tracer un aller-retour vélo'
                              : 'Generate Out & Back Route'
                            : isFr
                            ? 'Tracer la boucle vélo'
                            : 'Generate Bike Loop'}
                        </span>
                      </>
                    )}
                  </Button>

                  {coordinates && coordinates.length >= 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        const nextBearing = (loopBearingDeg + 65) % 360;
                        setLoopBearingDeg(nextBearing);
                        handleGenerateLoop(loopShape, nextBearing);
                      }}
                      disabled={isGeneratingLoop}
                      className="h-10 px-3 rounded-full bg-card border border-black/10 dark:border-white/15 text-xs font-rounded font-semibold text-ink-secondary hover:text-ink inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isFr ? 'Autre cap' : 'Rotate direction'}</span>
                    </Button>
                  )}
                </div>

                {fetchSuccessMessage && (
                  <p className="mt-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                    {fetchSuccessMessage}
                  </p>
                )}
                {fetchError && (
                  <p className="mt-2 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                    {fetchError}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Mode 3: Import GPX */}
          {routeMode === 'gpx' && (
            <div className="mb-5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".gpx,.tcx,.fit,application/gpx+xml,text/xml,application/xml,application/octet-stream"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-pod ring-1 ring-inset ring-black/10 dark:ring-white/10 bg-pod/60 hover:bg-pod text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 select-none"
              >
                <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-ink shadow-xs">
                  <Upload size={18} />
                </div>
                <span className="text-sm font-rounded font-bold text-ink">
                  {gpxFileName || (isFr ? 'Choisir un fichier GPX' : 'Select GPX trace')}
                </span>
                <span className="text-xs text-ink-muted font-body">
                  {isFr
                    ? 'Glissez un fichier ou cliquez pour parcourir'
                    : 'Drag and drop or click to browse'}
                </span>
              </div>
            </div>
          )}

          {/* Route Ready Status Box */}
          {isRouteReady && (
            <div className="p-3.5 rounded-pod bg-pod border border-black/5 dark:border-white/10 mb-4 flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Check size={12} className="stroke-[3]" />
              </span>
              <div>
                <div className="text-xs font-rounded font-bold text-ink flex items-center gap-1.5">
                  <span>{isFr ? 'Parcours prêt' : 'Route ready'}</span>
                  <span className="text-ink-muted">·</span>
                  <span className="tnum">{distanceKm.toFixed(1)} km</span>
                </div>
                <p className="text-[11px] text-ink-muted font-body mt-0.5">
                  {isFr
                    ? 'Calculé pour cet itinéraire cyclable.'
                    : 'Calculated for this bicycle route.'}
                </p>
              </div>
            </div>
          )}

          {/* Alternative Link */}
          {routeMode === 'from-to' && (
            <div className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onChangeRouteMode('distance')}
                className="text-xs font-rounded font-bold text-ink hover:underline text-left cursor-pointer flex items-center gap-1 mb-1"
              >
                <span>
                  {isFr
                    ? 'Tracer une boucle depuis Départ + Distance →'
                    : 'Build a bike loop from Start + Distance →'}
                </span>
              </Button>
              <p className="text-xs text-ink-muted font-body leading-relaxed">
                {isFr
                  ? 'Choisissez un point de départ et une distance : Cadence trace une vraie boucle cyclable (ou un aller-retour) prête pour le GPS.'
                  : 'Pick a start point and distance — Cadence generates a real road-snapped circular loop or out-and-back ride.'}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Route Map Preview */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bento-card bg-card text-ink rounded-card p-5 sm:p-6 border border-black/5 dark:border-white/10 shadow-xs flex flex-col">
            <SchematicRouteMap
              originLabel={origin.split(',')[0] || (isFr ? 'Départ' : 'Start')}
              destinationLabel={destination.split(',')[0] || (isFr ? 'Arrivée' : 'Finish')}
              distanceKm={distanceKm}
              coordinates={coordinates}
              waypoints={intermediateStops.map((s) => ({
                id: s.id,
                name: s.name,
                coordinates: s.coords || undefined,
              }))}
              className="mb-4"
            />

            <div className="pt-3 border-t border-black/5 dark:border-white/10">
              <div className="flex items-center justify-between text-xs font-medium mb-1">
                <span className="text-ink-muted">
                  {isFr ? 'Distance de l’itinéraire' : 'Example route distance'}
                </span>
                <span className="text-sm font-rounded font-bold text-ink tnum">
                  {distanceKm.toFixed(1)} km
                </span>
              </div>
              <p className="text-[11.5px] text-ink-muted font-body leading-relaxed mt-2">
                {isFr
                  ? 'Aperçu cartographique du trajet avec tracé cyclable et bornes kilométriques.'
                  : 'Map preview of the ride corridor with cycling route line and distance.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
