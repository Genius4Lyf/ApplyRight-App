import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    // Strip dev-only console noise from PRODUCTION bundles only (dev server is
    // unaffected). Keep console.warn/error so real problems still surface in the
    // browser console. Marking these pure lets the build minifier drop them.
    pure: ['console.log', 'console.info', 'console.debug'],
    drop: ['debugger'],
  },
  optimizeDeps: {
    // Force Vite to pre-bundle Capacitor plugins. Filesystem and Share import
    // from @capacitor/synapse which Vite's auto-detection misses, leaving
    // bare specifiers in the build output that the browser can't resolve.
    include: [
      '@capacitor/filesystem',
      '@capacitor/share',
      '@capacitor/status-bar',
      '@capacitor/splash-screen',
      '@capacitor/synapse',
    ],
  },
});
