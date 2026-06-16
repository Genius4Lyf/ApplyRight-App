import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { THEME_STORAGE_KEY } from '../utils/theme';

const ThemeContext = createContext(null);

const prefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

// Resolve the initial theme: an explicit stored choice wins; otherwise we follow
// the OS preference. The actual `.dark` class is applied per-route by RootLayout
// (see src/utils/theme.js) — this provider only owns the preference *value*.
const getInitialTheme = () => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage unavailable (private mode / SSR) — fall through to system.
  }
  return prefersDark() ? 'dark' : 'light';
};

const hasStoredChoice = () => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark';
  } catch {
    return false;
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(getInitialTheme);

  // Persist an explicit user choice. Once stored, we stop following the OS.
  const setTheme = useCallback((next) => {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ignore persistence failures
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // While the user has NOT made an explicit choice, track OS theme changes live.
  // Once they pick a value, this listener stops mattering (we read the stored
  // choice guard each time the event fires).
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => {
      if (hasStoredChoice()) return;
      setThemeState(e.matches ? 'dark' : 'light');
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
};
