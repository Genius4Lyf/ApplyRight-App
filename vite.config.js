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
  test: {
    // Node environment by default — pure logic modules (src/lib) need nothing more.
    // Component suites opt into jsdom per file with a `@vitest-environment` pragma.
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
    // Owns the async-assertion timeout for the whole suite. See src/test/setup.js for why
    // this is global rather than per-call. Named outside the include glob so it is not
    // collected as a suite of its own.
    setupFiles: ['./src/test/setup.js'],
    // The per-test ceiling, which must stay ABOVE setup.js's asyncUtilTimeout — otherwise a
    // slow findBy just trades "query timed out" for "test timed out" and nothing improves.
    testTimeout: 15000,
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
