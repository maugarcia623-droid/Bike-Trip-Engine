import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  X,
  SpinnerGap,
  Compass,
  TrainSimple,
  Buildings,
  NavigationArrow,
} from '@/components/icons';
import {
  LocationSuggestion,
  searchLocationSuggestions,
  POPULAR_CYCLING_HUBS,
  formatTypeBadge,
} from '../../services/locationService';
import { useTranslation } from '../../context/LanguageContext';
import { Badge } from '../common/Badge';
import { IconBadge } from '../common/IconBadge';
import { LayeredTokenTheme } from '../../tokens/chipTokens';

interface LocationAutocompleteInputProps {
  id?: string;
  label: string;
  value: string;
  placeholder?: string;
  biasCoords?: [number, number];
  dropdownAlign?: 'left' | 'right';
  onChange: (value: string) => void;
  onSelectLocation: (suggestion: LocationSuggestion) => void;
  onKeyDownEnter?: () => void;
}

export const LocationAutocompleteInput: React.FC<LocationAutocompleteInputProps> = ({
  id,
  label,
  value,
  placeholder,
  biasCoords,
  dropdownAlign = 'left',
  onChange,
  onSelectLocation,
  onKeyDownEnter,
}) => {
  const { lang, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on click/tap outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Fetch suggestions when value changes
  useEffect(() => {
    const trimmed = value.trim();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

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
          lang,
          biasCoords,
          signal: controller.signal,
          limit: 7,
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
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [value, lang, biasCoords]);

  const handleSelect = useCallback(
    (suggestion: LocationSuggestion) => {
      onChange(suggestion.name);
      onSelectLocation(suggestion);
      setIsOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.blur();
    },
    [onChange, onSelectLocation]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const visibleList = value.trim().length >= 2 ? suggestions : POPULAR_CYCLING_HUBS;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) =>
          prev < visibleList.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) {
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : visibleList.length - 1
        );
      }
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < visibleList.length) {
        e.preventDefault();
        handleSelect(visibleList[highlightedIndex]);
      } else {
        setIsOpen(false);
        if (onKeyDownEnter) {
          e.preventDefault();
          onKeyDownEnter();
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleClear = () => {
    onChange('');
    setSuggestions([]);
    setIsOpen(true);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const getSuggestionBadgeSpec = (
    type?: string
  ): { icon: React.ElementType; theme: LayeredTokenTheme } => {
    if (!type) return { icon: MapPin, theme: 'greyscale' };
    const tLower = type.toLowerCase();
    if (tLower.includes('station') || tLower.includes('railway') || tLower.includes('train')) {
      return { icon: TrainSimple, theme: 'emerald' };
    }
    if (tLower.includes('building') || tLower.includes('hotel') || tLower.includes('house') || tLower.includes('housenumber')) {
      return { icon: Buildings, theme: 'amber' };
    }
    if (tLower.includes('city') || tLower.includes('town') || tLower.includes('village') || tLower.includes('municipality')) {
      return { icon: Compass, theme: 'blue' };
    }
    if (tLower.includes('street')) {
      return { icon: NavigationArrow, theme: 'greyscale' };
    }
    return { icon: MapPin, theme: 'greyscale' };
  };

  const displayList = value.trim().length >= 2 ? suggestions : POPULAR_CYCLING_HUBS;
  const showDropdown =
    isOpen &&
    (displayList.length > 0 ||
      (isLoading && value.trim().length >= 2) ||
      (value.trim().length >= 2 && !isLoading && suggestions.length === 0));

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Stable, fixed-height label row that never moves or wraps */}
      <label htmlFor={id} className="block text-xs font-semibold text-ink-secondary mb-1.5 px-1 truncate">
        {label}
      </label>

      {/* Input Capsule */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 pointer-events-none flex items-center justify-center text-ink-muted">
          <MapPin className="w-4 h-4" />
        </div>

        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('locationSearchPlaceholder')}
          autoComplete="off"
          className="w-full h-11 sm:h-12 bg-pod rounded-full pl-10 pr-9 text-sm font-medium text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-ink/20 transition-all"
        />

        <div className="absolute right-3 flex items-center gap-1.5">
          {isLoading ? (
            <SpinnerGap className="w-4 h-4 animate-spin text-ink-muted" />
          ) : value.length > 0 ? (
            <button
              type="button"
              onClick={handleClear}
              title={t('autocompleteClear')}
              className="p-1 rounded-full text-ink-muted hover:text-ink hover:bg-card/70 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Floating Suggestions Dropdown with Generous Width */}
      {showDropdown && (
        <div
          className={`absolute top-full mt-2 z-50 bg-card/95 backdrop-blur-md rounded-[20px] border border-ink/10 dark:border-white/10 shadow-2xl p-2 max-h-72 overflow-y-auto animate-fade-in w-full md:min-w-[420px] max-w-[calc(100vw-2.5rem)] ${
            dropdownAlign === 'right' ? 'left-0 md:left-auto md:right-0' : 'left-0'
          }`}
        >
          {value.trim().length < 2 && (
            <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider uppercase text-ink-muted border-b border-ink/5 dark:border-white/5 mb-1">
              {t('autocompletePopularHubs')}
            </div>
          )}

          {isLoading && suggestions.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-5 text-xs text-ink-muted">
              <SpinnerGap className="w-4 h-4 animate-spin" />
              <span>{t('autocompleteSearching')}</span>
            </div>
          ) : suggestions.length === 0 && value.trim().length >= 2 ? (
            <div className="py-4 px-3 text-center text-xs text-ink-muted">
              {t('autocompleteNoResults')}
            </div>
          ) : (
            <div className="space-y-1">
              {displayList.map((suggestion, index) => {
                const isHighlighted = highlightedIndex === index;
                const badgeSpec = getSuggestionBadgeSpec(suggestion.type);
                return (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => handleSelect(suggestion)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-start gap-3 transition-colors cursor-pointer ${
                      isHighlighted
                        ? 'bg-pod dark:bg-chip text-ink'
                        : 'hover:bg-pod/70 text-ink'
                    }`}
                  >
                    <IconBadge
                      theme={badgeSpec.theme}
                      icon={badgeSpec.icon}
                      size="sm"
                      solidBacker
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-ink leading-snug truncate">
                        {suggestion.name}
                      </div>
                      {suggestion.secondaryText && (
                        <div className="text-xs text-ink-muted leading-relaxed mt-0.5 line-clamp-2">
                          {suggestion.secondaryText}
                        </div>
                      )}
                    </div>
                    {suggestion.type && (
                      <Badge
                        variant={badgeSpec.theme === 'greyscale' ? 'zinc' : badgeSpec.theme}
                        size="xs"
                        className="shrink-0 self-center ml-1"
                      >
                        {formatTypeBadge(suggestion.type, lang)}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
