import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const STORAGE_KEY_THEME = 'bike_trip_engine_theme_v1';

export function getSystemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

export function getInitialTheme(): Theme {
  try {
    if (typeof window !== 'undefined') {
      if (window.location.search.includes('theme=light')) return 'light';
      if (window.location.search.includes('theme=dark')) return 'dark';
    }
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch (e) {
    console.error('Error reading theme from localStorage', e);
  }
  return getSystemTheme();
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [hasUserPreference, setHasUserPreference] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      return saved === 'light' || saved === 'dark';
    } catch {
      return false;
    }
  });

  // Dynamically follow system theme if user has not set an explicit override
  useEffect(() => {
    if (hasUserPreference || typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setThemeState(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [hasUserPreference]);

  // Synchronize DOM classes whenever theme changes
  useEffect(() => {
    const isDark = theme === 'dark';
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.classList.toggle('light', !isDark);
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = isDark ? 'dark' : 'light';
  }, [theme]);

  const toggleTheme = () => {
    setHasUserPreference(true);
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY_THEME, next);
      } catch (e) {
        console.error('Error saving theme to localStorage', e);
      }
      return next;
    });
  };

  const setTheme = (newTheme: Theme) => {
    setHasUserPreference(true);
    try {
      localStorage.setItem(STORAGE_KEY_THEME, newTheme);
    } catch (e) {
      console.error('Error saving theme to localStorage', e);
    }
    setThemeState(newTheme);
  };

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
