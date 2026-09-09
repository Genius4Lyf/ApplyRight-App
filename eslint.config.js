import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  // BUILD OUTPUT IS NOT SOURCE.
  //
  // Only `dist` was ignored, so `npm run lint` was also linting the Capacitor Android
  // project — which contains a COPY of the built web bundle, minified, plus two more
  // copies under build/intermediates. That produced 1,975 problems (41% of the entire
  // lint run) about generated code nobody can edit, and it is why the real numbers were
  // never worth reading.
  //
  // playwright-report and test-results are likewise generated on every e2e run.
  globalIgnores(['dist', 'android', 'playwright-report', 'test-results', 'coverage']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      prettier: prettierPlugin,
      'jsx-a11y': jsxA11y,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      ...prettierConfig.rules,
      ...jsxA11y.configs.recommended.rules,
      'prettier/prettier': 'error',
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // NODE CONTEXT, not browser.
    //
    // The base config gives every file `globals.browser`, so these — which run under
    // Node, not in a page — reported `process`, `require` and `__dirname` as undefined.
    // Ten errors that were never bugs.
    //
    // The point is not the ten. `no-undef` is the rule that catches a real crash: a
    // symbol referenced but never imported, which throws a ReferenceError the moment
    // that line runs. One such bug was hiding in this list — TemplatePreviewThumb's
    // fallback still named a component that had stopped being imported, so an unknown
    // template id would have taken the picker down instead of falling back. It was
    // indistinguishable from ten complaints about `process`. Now any no-undef is real.
    files: [
      'vite.config.js',
      'playwright.config.js',
      'replace_theme.js',
      'scripts/**/*.js',
      'e2e/**/*.js',
      '**/*.test.{js,jsx}',
    ],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // The service worker has neither `window` nor `document`, and does have
    // `importScripts` and `self`.
    files: ['sw.js'],
    languageOptions: { globals: { ...globals.serviceworker } },
  },
  {
    // Aria Studio — TDZ guard, scoped.
    //
    // A hook dependency array is evaluated DURING RENDER, so naming a `const` that is
    // declared lower in the file throws "Cannot access 'x' before initialization" and
    // takes the whole provider down. That shipped once (loadSession depending on
    // flushChats, declared ~90 lines below) past a green build, green lint and 179
    // green tests, because nothing mounted the provider.
    //
    // Enabled here rather than repo-wide: there are ~46 pre-existing hits elsewhere,
    // and a noisy rule gets disabled. Scoped, it is zero-noise and blocks the class
    // where it actually caused an outage. Complements the provider smoke test —
    // static catch first, runtime catch as backstop.
    files: [
      'src/context/AriaStudioContext.jsx',
      'src/components/ariaStudio/**/*.{js,jsx}',
      'src/pages/AriaStudio/**/*.{js,jsx}',
      'src/hooks/useStudioLayout.js',
      'src/lib/studioFlow.js',
      // Added 2026-09-09 after the SECOND outage of this exact class: a railProps object
      // referencing `isUnlocked`, a const arrow function declared 250 lines lower. The
      // file had only two pre-existing hits and both were moved rather than suppressed,
      // so this stays zero-noise. See ResumeReview.smoke.test.jsx for the runtime half.
      'src/pages/ResumeReview.jsx',
      'src/components/cv/StudioDesignRail.jsx',
    ],
    rules: {
      'no-use-before-define': ['error', { variables: true, functions: false, classes: false }],
    },
  },
]);
