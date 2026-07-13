import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { AlertTriangle, Info, X, Megaphone, ShieldAlert } from 'lucide-react';
// `motion` is used only via <motion.div> in JSX; this eslint config lacks
// jsx-uses-vars so it reads as unused — suppress the false positive.
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

const GlobalBanner = () => {
  const [banner, setBanner] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  // Separate piece of state: AI is unavailable if the backend has no API key
  // configured. Surfaces to the user before they trigger a generation that
  // would 503 with "you have not been charged."
  const [aiUnavailable, setAiUnavailable] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/auth/config');

        if (res.data.announcement && res.data.announcement.enabled) {
          setBanner(res.data.announcement);
          setIsVisible(true);
        } else {
          setBanner(null);
        }

        // aiAvailable defaults to true if the field is missing (older backends).
        setAiUnavailable(res.data.features?.aiAvailable === false);
      } catch (error) {
        console.error('Failed to fetch global banner', error);
      }
    };

    fetchSettings();

    window.addEventListener('settings_updated', fetchSettings);
    return () => window.removeEventListener('settings_updated', fetchSettings);
  }, []);

  // Compose AI-unavailable banner above the admin announcement banner. We
  // render both if both are active; nothing if neither.
  if ((!banner || !isVisible) && !aiUnavailable) return null;

  const themes = {
    info: { bg: 'bg-indigo-600', border: 'border-indigo-700', icon: Megaphone },
    warning: { bg: 'bg-amber-500', border: 'border-amber-600', icon: AlertTriangle },
    critical: { bg: 'bg-rose-600', border: 'border-rose-700', icon: ShieldAlert },
  };

  const theme = banner ? themes[banner.type] || themes.info : null;
  const Icon = theme ? theme.icon : null;

  return (
    <>
      {/* AI-unavailable banner — non-dismissible, server-state-driven */}
      {aiUnavailable && (
        <div className="bg-amber-500/95 text-white border-b border-amber-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-center gap-2 text-sm font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              AI is currently unavailable on this server. Generation features are disabled — you
              won't be charged.
            </span>
          </div>
        </div>
      )}

      <AnimatePresence>
        {banner && isVisible && theme && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="relative overflow-hidden"
          >
            {/* Flat solid semantic bar with a bottom hairline */}
            <div className={`${theme.bg} border-b ${theme.border}`}>
              <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 text-white shrink-0" />

                  {/* Message */}
                  <p className="text-sm font-medium text-white/95 tracking-wide min-w-0">
                    {banner.message}
                  </p>
                </div>

                {/* Dismiss button */}
                <button
                  onClick={() => setIsVisible(false)}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-white/15 text-white/70 hover:text-white transition-all duration-200"
                  aria-label="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GlobalBanner;
