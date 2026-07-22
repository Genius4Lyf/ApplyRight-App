import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist']),
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
    ],
    rules: {
      'no-use-before-define': ['error', { variables: true, functions: false, classes: false }],
    },
  },
]);
