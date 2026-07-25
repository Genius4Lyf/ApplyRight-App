import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
// i18n must initialise before anything renders, and before lib/lang normalizes
// the stored language. Imported for the side effect of i18n.init().
import './i18n';
import { initLang } from './lib/lang';
import App from './App.jsx';

// Reconcile storage with the detector so `lang` only ever holds a supported code
// — api.js reads that key verbatim for the X-App-Language header.
initLang();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
