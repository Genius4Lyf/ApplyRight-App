// Vitest setup — runs before every test file.
//
// ONE place that owns how long an async assertion may wait.
//
// React Testing Library defaults `asyncUtilTimeout` to 1000ms, which is fine for a small
// component and much too tight for a tree the size of StudioChat under a parallel run. The
// symptom is a suite whose failure COUNT moves on its own: files pass alone and fail in the
// full run, so "how many failures" stops being a usable regression signal — you cannot tell
// a real break from a slow machine. Adding test files makes it worse, so it degrades exactly
// as the codebase grows.
//
// This was previously patched per-call, in one file, with `{ timeout: 2500 }` on individual
// findBy queries. That fixed one file's symptom and left the cause everywhere else. Prefer
// this global — and do NOT reintroduce per-call overrides, because a lower local value
// silently wins and the next person then has two places to look.
//
// `configure` is pure configuration and touches no DOM at import time, so this is safe even
// though vite.config.js defaults `environment: 'node'` and individual suites opt into jsdom
// with a `@vitest-environment` pragma.
import { configure } from '@testing-library/dom';

configure({ asyncUtilTimeout: 5000 });
