import { useState, useEffect } from 'react';

// Shared, persisted Aria-chat background theme. All chat surfaces subscribe to one
// value via a window event (no prop-drilling), and it survives reloads via localStorage.
const KEY = 'ariaChatTheme';
const EVT = 'aria-chat-theme';

export function useChatTheme() {
  const [theme, set] = useState(
    () => (typeof localStorage !== 'undefined' && localStorage.getItem(KEY)) || 'studio'
  );
  useEffect(() => {
    const on = () => set(localStorage.getItem(KEY) || 'studio');
    window.addEventListener(EVT, on);
    window.addEventListener('storage', on);
    return () => {
      window.removeEventListener(EVT, on);
      window.removeEventListener('storage', on);
    };
  }, []);
  const setTheme = (t) => {
    localStorage.setItem(KEY, t);
    window.dispatchEvent(new Event(EVT));
  };
  return [theme, setTheme];
}
