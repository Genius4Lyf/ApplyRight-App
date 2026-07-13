// Pure, JSX-free helpers for the Applications redesign. These derive display
// signals from an application record WITHOUT assuming any field is present —
// every access is guarded so a partially-hydrated app never throws.
import { hasInterviewPrep } from '../utils/interviewPrep';

/**
 * Map a fit score (0–100, or null/undefined when not yet analyzed) to a
 * semantic band used for accent color. Null scores read as 'neutral'.
 * @param {number|null|undefined} score
 * @returns {'ok'|'warn'|'bad'|'neutral'}
 */
export function bandOf(score) {
  if (score == null) return 'neutral';
  if (score >= 75) return 'ok';
  if (score >= 45) return 'warn';
  return 'bad';
}

/**
 * Stat-strip figures computed only from fields that exist on an application.
 * Every value falls back to 0 rather than throwing on a missing field.
 * @param {Array<object>} applications
 * @returns {Array<{ label: string, value: string|number, tone: 'ok'|'neutral' }>}
 */
export function momentumStats(applications = []) {
  const apps = Array.isArray(applications) ? applications : [];

  const bestMatch = apps.reduce((max, a) => {
    const score = a?.optimizedFitScore ?? a?.fitScore ?? 0;
    return score > max ? score : max;
  }, 0);

  const interviewReady = apps.filter((a) => hasInterviewPrep(a)).length;
  const tailored = apps.filter((a) => !!(a?.optimizedCV || a?.draftCVId)).length;

  return [
    { label: 'Roles analyzed', value: apps.length, tone: 'neutral' },
    { label: 'Best match', value: `${bestMatch}%`, tone: 'ok' },
    { label: 'Interview-ready', value: interviewReady, tone: 'neutral' },
    { label: 'Tailored CVs', value: tailored, tone: 'neutral' },
  ];
}

/**
 * The single most useful next action for an application, chosen by priority.
 * `icon` is a lucide component NAME (string) so the caller resolves the icon.
 * @param {object} app
 * @returns {{ label: string, tone: 'accent'|'ok'|'warn'|'bad'|'neutral', icon: string }}
 */
export function nextMove(app) {
  const a = app || {};
  const optimizedCV = !!a.optimizedCV;
  const mustHaves = (a.fitAnalysis?.missingSkills || []).filter(
    (s) => s?.importance === 'must_have'
  );
  const score = a.optimizedFitScore ?? a.fitScore;
  const hasScore = typeof score === 'number';

  // 1. Concrete gaps to close and no tailored CV yet — the highest-value fix.
  if (mustHaves.length > 0 && !optimizedCV) {
    const n = mustHaves.length;
    return {
      label: `Fix your CV — ${n} skill${n === 1 ? '' : 's'} to close`,
      tone: 'bad',
      icon: 'Wrench',
    };
  }

  // 2. Scored but not yet optimized — nudge toward tailoring.
  if (hasScore && !optimizedCV) {
    return { label: 'Optimize your CV', tone: 'accent', icon: 'TrendingUp' };
  }

  // 3. CV is tailored but the cover letter is still missing.
  if (optimizedCV && !a.coverLetter) {
    return { label: 'Generate your cover letter', tone: 'accent', icon: 'Mail' };
  }

  // 4. Prep exists — surface it for review.
  if (hasInterviewPrep(a)) {
    return {
      label: 'Interview-ready — review your prep',
      tone: 'ok',
      icon: 'CheckCircle2',
    };
  }

  // 5. Nothing pressing — a neutral catch-all.
  return { label: 'Review your application', tone: 'neutral', icon: 'ArrowRight' };
}
