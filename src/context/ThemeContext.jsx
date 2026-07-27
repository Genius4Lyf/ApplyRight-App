import React, { createContext, useContext, useState, useCallback } from 'react';
import { THEME_STORAGE_KEY } from '../utils/theme';

const ThemeContext = createContext(null);

// Resolve the initial theme: an explicit stored choice wins; otherwise the app
// defaults to dark. The actual `.dark` class is applied per-route by RootLayout
// (see src/utils/theme.js) — this provider only owns the preference *value*.
const getInitialTheme = () => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage unavailable (private mode / SSR) — fall through to default.
  }
  return 'dark'; // app default — explicit user choice (via setTheme) overrides this
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
