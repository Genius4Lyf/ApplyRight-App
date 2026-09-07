import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
// i18n must initialise before anything renders, and before lib/lang normalizes
// the stored language. The import runs i18n.init() as a side effect; the instance
// itself is needed below to wait for a non-English locale chunk.
import i18n from './i18n';
import { initLang } from './lib/lang';
import App from './App.jsx';

// Reconcile storage with the detector so `lang` only ever holds a supported code
// — api.js reads that key verbatim for the X-App-Language header.
const lang = initLang();

const boot = () =>
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>
  );

// English is in the bundle, so it paints immediately. Any other language now
// arrives as its own chunk (see i18n/index.js), and rendering before it lands would
// show a French user a full screen of English that then re-renders under them.
//
// The wait is not a blank page: index.html paints a boot screen that this render
// replaces. Waiting a beat for the right language beats flashing the wrong one.
//
// Booting anyway on failure is deliberate — a missing chunk must degrade to an
// English app, never to no app.
if (lang === 'en') {
  boot();
} else {
  i18n.loadLanguages(lang).then(boot, boot);
}
