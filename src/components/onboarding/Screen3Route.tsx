import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  Compass,
  SpinnerGap,
  MapPin,
  X,
  TrainSimple,
  Buildings,
} from '@/components/icons';
import { useTranslation } from '../../context/LanguageContext';
import { SchematicRouteMap } from './SchematicRouteMap';
import { parseGpxFileContent } from '../../utils/gpxParser';
import { calculateAutoBikeRoute } from '../../utils/routing';
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
  onChange: (val: string) => void;
  onSelectSuggestion: (suggestion: LocationSuggestion) => void;
}

const EXTENDED_CYCLING_HUBS: LocationSuggestion[] = [
  {
    id: 'hub-trentemoult',
    name: 'Trentemoult, Rezé',
    secondaryText: '44400 Rezé, Loire-Atlantique (Bords de Loire)',
    fullDisplayName: 'Trentemoult, 44400 Rezé, France',
    coordinates: [47.1944, -1.5833],
    type: 'village',
  },
  {
    id: 'hub-nantes-gare',
    name: 'Nantes gare, Nantes',
    secondaryText: '44000 Nantes (Gare SNCF Accès Nord/Sud)',
    fullDisplayName: 'Gare de Nantes, 44000 Nantes, France',
    coordinates: [47.2173, -1.5422],
    type: 'station',
  },
  {
    id: 'hub-nantes-centre',
    name: 'Nantes Quai de la Fosse',
    secondaryText: '44000 Nantes (Piste cyclable Loire à Vélo)',
    fullDisplayName: 'Quai de la Fosse, 44000 Nantes, France',
    coordinates: [47.2115, -1.5583],
    type: 'street',
  },
  {
    id: 'hub-st-nazaire',
    name: 'Saint-Nazaire Gate 17',
    secondaryText: '44600 Saint-Nazaire (Chantiers & Estuaire)',
    fullDisplayName: 'Saint-Nazaire, 44600 Loire-Atlantique, France',
    coordinates: [47.2734, -2.2139],
    type: 'city',
  },
  {
    id: 'hub-pornic',
    name: 'Pornic Château',
    secondaryText: '44210 Pornic (Port & Baie de Bourgneuf)',
    fullDisplayName: 'Pornic, 44210 Loire-Atlantique, France',
    coordinates: [47.1147, -2.1028],
    type: 'city',
  },
  {
    id: 'hub-clisson',
    name: 'Clisson Gare',
    secondaryText: '44190 Clisson (Vignoble & Vallée de la Sèvre)',
    fullDisplayName: 'Clisson, 44190 Loire-Atlantique, France',
    coordinates: [47.0872, -1.2828],
    type: 'station',
  },
  ...POPULAR_CYCLING_HUBS.filter(
    (h) => h.id !== 'preset-nantes' && h.id !== 'preset-st-nazaire'
  ),
];

const RouteLocationInput: React.FC<RouteLocationInputProps> = ({
  label,
  value,
  badgeLetter,
  placeholder,
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
        const results = await searchLocationSuggestions(trimmed, {
          lang: isFr ? 'fr' : 'en',
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
  }, [value, isFr]);

  const handleSelect = useCallback(
    (suggestion: LocationSuggestion) => {
      onChange(suggestion.name);
      onSelectSuggestion(suggestion);
      setIsOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.blur();
    },
    [onChange, onSelectSuggestion]
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
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(true);
                inputRef.current?.focus();
              }}
              className="p-1 text-ink-muted hover:text-ink cursor-pointer"
              title={isFr ? 'Effacer' : 'Clear'}
            >
              <X size={13} />
            </button>
          )}

          <span className="w-6 h-6 rounded-full bg-pod flex items-center justify-center text-xs font-rounded font-bold text-ink-muted border border-black/5 dark:border-white/10 pointer-events-none shrink-0">
            {badgeLetter}
          </span>
        </div>
      </div>

      {/* Floating Auto-Fill Suggestions Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-card rounded-pod border border-black/10 dark:border-white/15 shadow-xl overflow-hidden max-h-64 overflow-y-auto animate-apple-popover">
          <div className="px-3 py-1.5 bg-pod/60 border-b border-black/5 dark:border-white/10 text-[10.5px] font-mono text-ink-muted uppercase tracking-wider flex items-center justify-between">
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
  isRouteReady: boolean;
  gpxFileName?: string;
  onUpdateOrigin: (val: string) => void;
  onUpdateDestination: (val: string) => void;
  onUpdateDistance: (km: number) => void;
  onUpdateCoordinates: (coords: [number, number][]) => void;
  onGpxLoaded?: (parsed: { name: string; distanceKm: number; coordinates: [number, number][] }) => void;
  onBack: () => void;
  onContinue: () => void;
}

const QUICK_HUBS = [
  {
    origin: 'Trentemoult, Rezé',
    destination: 'Nantes gare, Nantes',
    label: 'Trentemoult → Gare de Nantes',
    coords: [
      [47.1944, -1.5833] as [number, number],
      [47.2173, -1.5422] as [number, number],
    ],
  },
  {
    origin: 'Nantes Quai de la Fosse',
    destination: 'Saint-Nazaire Gate 17',
    label: 'Nantes → Saint-Nazaire',
    coords: [
      [47.2115, -1.5583] as [number, number],
      [47.2734, -2.2139] as [number, number],
    ],
  },
  {
    origin: 'Pornichet Port',
    destination: 'Le Croisic Côte Sauvage',
    label: 'Pornichet → Le Croisic',
    coords: [
      [47.2625, -2.3389] as [number, number],
      [47.2936, -2.5117] as [number, number],
    ],
  },
  {
    origin: 'Clisson Gare',
    destination: 'Nantes Île de Nantes',
    label: 'Clisson → Île de Nantes',
    coords: [
      [47.0872, -1.2828] as [number, number],
      [47.2081, -1.5645] as [number, number],
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
  isRouteReady,
  gpxFileName,
  onUpdateOrigin,
  onUpdateDestination,
  onUpdateDistance,
  onUpdateCoordinates,
  onGpxLoaded,
  onBack,
  onContinue,
}) => {
  const { lang } = useTranslation();
  const isFr = lang === 'fr';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [originCoords, setOriginCoords] = useState<[number, number] | null>([47.1944, -1.5833]);
  const [destCoords, setDestCoords] = useState<[number, number] | null>([47.2173, -1.5422]);

  const [isFetchingDistance, setIsFetchingDistance] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchSuccessMessage, setFetchSuccessMessage] = useState<string | null>(null);

  const handleFetchDistance = async (originText = origin, destText = destination) => {
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
        originCoords,
        destCoords
      );
      if (result) {
        onUpdateDistance(Number(result.distanceKm.toFixed(1)));
        if (result.coordinates && result.coordinates.length > 1) {
          onUpdateCoordinates(result.coordinates);
        }
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
      const text = await file.text();
      const parsed = parseGpxFileContent(text);
      if (parsed && parsed.distanceKm > 0) {
        if (onGpxLoaded) {
          onGpxLoaded({
            name: file.name.replace(/\.gpx$/i, ''),
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
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-ink-muted uppercase mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-volt" />
            <span>{isFr ? 'PARCOURS' : 'ROUTE'}</span>
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
            <button
              type="button"
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
            </button>
            <button
              type="button"
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
            </button>
            <button
              type="button"
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
            </button>
          </div>

          {/* Mode 1: From / To Inputs with Auto-Fill Suggestions Dropdown */}
          {routeMode === 'from-to' && (
            <div className="space-y-4 mb-4">
              {/* Origin Auto-Fill Input */}
              <RouteLocationInput
                label={isFr ? 'Départ' : 'From'}
                value={origin}
                badgeLetter="A"
                placeholder={isFr ? 'Ex: Trentemoult, Rezé ou tapez une ville' : 'e.g. Trentemoult, Rezé or type city'}
                onChange={onUpdateOrigin}
                onSelectSuggestion={(s) => {
                  if (s.coordinates) setOriginCoords(s.coordinates);
                }}
              />

              {/* Destination Auto-Fill Input */}
              <RouteLocationInput
                label={isFr ? 'Arrivée' : 'To'}
                value={destination}
                badgeLetter="B"
                placeholder={isFr ? 'Ex: Nantes gare, Nantes ou gare' : 'e.g. Nantes gare, Nantes or station'}
                onChange={onUpdateDestination}
                onSelectSuggestion={(s) => {
                  if (s.coordinates) setDestCoords(s.coordinates);
                }}
              />

              {/* Auto-fill Quick Hubs Pills */}
              <div>
                <div className="text-[11px] font-medium text-ink-muted mb-1.5 font-body">
                  {isFr ? 'Suggestions d’itinéraires rapides :' : 'Quick auto-fill routes:'}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_HUBS.map((hub) => (
                    <button
                      key={hub.label}
                      type="button"
                      onClick={() => {
                        onUpdateOrigin(hub.origin);
                        onUpdateDestination(hub.destination);
                        if (hub.coords) {
                          setOriginCoords(hub.coords[0]);
                          setDestCoords(hub.coords[1]);
                        }
                        handleFetchDistance(hub.origin, hub.destination);
                      }}
                      className="px-2.5 py-1 rounded-full text-[11px] font-rounded font-semibold bg-pod hover:bg-chip text-ink-secondary border border-black/5 dark:border-white/10 transition-colors cursor-pointer"
                    >
                      {hub.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fetch Distance Button */}
              <div className="pt-1">
                <button
                  type="button"
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
                </button>
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
                onChange={onUpdateOrigin}
                onSelectSuggestion={(s) => {
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
                      className="w-16 px-2 py-0.5 rounded-lg bg-card text-ink font-rounded font-bold text-sm text-right tnum border border-black/15 dark:border-white/20 focus:outline-none focus:ring-2 focus:ring-volt"
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
                <div className="flex justify-between text-[10px] text-ink-muted mt-1 font-mono">
                  <span>2 km</span>
                  <span>50 km</span>
                  <span>100 km</span>
                  <span>150 km</span>
                  <span>200 km</span>
                  <span>250 km</span>
                </div>
              </div>
            </div>
          )}

          {/* Mode 3: Import GPX */}
          {routeMode === 'gpx' && (
            <div className="mb-5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".gpx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-pod border-2 border-dashed border-black/20 dark:border-white/20 bg-pod/50 hover:bg-pod text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 select-none"
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
              <button
                type="button"
                onClick={() => onChangeRouteMode('distance')}
                className="text-xs font-rounded font-bold text-ink hover:underline text-left cursor-pointer flex items-center gap-1 mb-1"
              >
                <span>
                  {isFr
                    ? 'Utiliser une simple estimation de distance →'
                    : 'Use a distance-only estimate instead →'}
                </span>
              </button>
              <p className="text-xs text-ink-muted font-body leading-relaxed">
                {isFr
                  ? 'Entrez les kilomètres sans tracer de carte. Vous obtiendrez l’estimation de temps sans tracé.'
                  : 'Enter kilometres without plotting a route. You’ll get a time estimate, but no route map or directions.'}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Route Map Preview */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bento-card bg-card text-ink rounded-card p-5 sm:p-6 border border-black/5 dark:border-white/10 shadow-xs flex flex-col">
            <SchematicRouteMap
              originLabel={origin.split(',')[0] || 'Trentemoult'}
              destinationLabel={destination.split(',')[0] || 'Nantes gare'}
              distanceKm={distanceKm}
              coordinates={coordinates}
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

      {/* Footer Navigation Bar - Sticky Mobile Bar */}
      <div className="sticky bottom-0 z-20 bg-card/95 backdrop-blur-md pt-3 sm:pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 shrink-0 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.3)] -mx-4 sm:-mx-8 md:-mx-10 px-4 sm:px-8 md:px-10 mt-auto">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-4 py-2 rounded-full border border-black/15 dark:border-white/20 bg-card hover:bg-pod text-ink text-xs font-rounded font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
        >
          <ArrowLeft size={14} />
          <span>{isFr ? 'Retour' : 'Back'}</span>
        </button>

        <span className="text-xs text-ink-muted font-body font-medium text-center">
          {isFr
            ? `Parcours prêt · ${distanceKm.toFixed(1)} km`
            : `Route ready · ${distanceKm.toFixed(1)} km`}
        </span>

        <button
          type="button"
          onClick={onContinue}
          className="min-h-[44px] px-5 py-2 rounded-full bg-volt text-[#4d5200] ring-2 ring-inset ring-[#a3b300] text-xs font-rounded font-bold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5 shadow-sm w-full sm:w-auto justify-center"
        >
          <span>{isFr ? 'Utiliser cet itinéraire' : 'Use this route'}</span>
          <ArrowRight size={14} className="stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
