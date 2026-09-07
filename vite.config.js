import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Third-party code into its own chunk, separate from ours.
        //
        // This does not shrink the first load — the browser still fetches both. What it
        // buys is CACHING: our source changes on every deploy, React and axios do not.
        // In one file, shipping a typo fix re-downloaded the entire vendor bundle for
        // every returning user. Split, the vendor chunk keeps its hash and stays cached.
        //
        // ONE vendor chunk, not a library-per-chunk scheme: splitting finer put
        // react-markdown and its transitive deps in different chunks that imported each
        // other, and Rollup warned about the circular result. A single boundary has no
        // such failure mode.
        // An ALLOWLIST, not "everything in node_modules". That version measured WORSE
        // than no splitting at all: sweeping every dependency into one eager vendor
        // chunk dragged recharts — which route-splitting had just moved into the admin
        // chunks — straight back into the first load. 418 KB became 574 KB.
        //
        // So only libraries the first paint already needs are named here. Moving those
        // cannot pull anything new forward, and everything else stays wherever Rollup
        // decided it was needed, which for a route-only library is that route.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (
            /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|axios|i18next|react-i18next|i18next-browser-languagedetector)[\\/]/.test(
              id
            )
          ) {
            return 'vendor';
          }
          return undefined;
        },
      },
    },
  },
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
