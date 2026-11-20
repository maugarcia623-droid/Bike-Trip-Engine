import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'light' | 'dark';
export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  themePreference: ThemePreference;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setThemePreference: (preference: ThemePreference) => void;
}

const STORAGE_KEY_THEME = 'bike_trip_engine_theme_v1';

export function getSystemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

export function getInitialThemePreference(): ThemePreference {
  try {
    if (typeof window !== 'undefined') {
      if (window.location.search.includes('theme=light')) return 'light';
      if (window.location.search.includes('theme=dark')) return 'dark';
    }
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch (e) {
    console.error('Error reading theme from localStorage', e);
  }
  return 'system';
}

export function getInitialTheme(): Theme {
  const pref = getInitialThemePreference();
  return pref === 'system' ? getSystemTheme() : pref;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(getInitialThemePreference);
  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme);

  const theme: Theme = themePreference === 'system' ? systemTheme : themePreference;

  // Dynamically follow system theme
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Synchronize DOM classes whenever theme changes
  useEffect(() => {
    const isDark = theme === 'dark';
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.classList.toggle('light', !isDark);
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = isDark ? 'dark' : 'light';
  }, [theme]);

  const setThemePreference = (newPreference: ThemePreference) => {
    try {
      localStorage.setItem(STORAGE_KEY_THEME, newPreference);
    } catch (e) {
      console.error('Error saving theme to localStorage', e);
    }
    setThemePreferenceState(newPreference);
  };

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setThemePreference(next);
  };

  const setTheme = (newTheme: Theme) => {
    setThemePreference(newTheme);
  };

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider
      value={{ theme, themePreference, isDark, toggleTheme, setTheme, setThemePreference }}
    >
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
