// Dynamic, step-aware coaching for the ATS Coach panel. Deterministic (no AI, no
// network) so it reacts instantly as the user types and moves between steps. The
// goal is to feel like a coach sitting beside the user — guiding what to do on
// THIS step, reacting to what they've actually entered, and building confidence —
// not just ticking "section present / absent" boxes.

import { computeCvHealth } from './cvHealth';

// The seven building steps (Review/finalize is excluded — there the panel
// switches to a live preview). Used for the "sections complete" progress that
// teases the preview waiting at Review. `label` is a translation key, resolved by
// callers via t() — this module has no i18next context of its own.
const BUILDING_STEPS = [
  {
    id: 'target_job',
    labelKey: 'cvBuilder.coach.stepNames.target_job',
    done: (cv) => !!cv.targetJob?.title?.trim(),
  },
  {
    id: 'heading',
    labelKey: 'cvBuilder.coach.stepNames.heading',
    done: (cv) => !!cv.personalInfo?.fullName,
  },
  {
    id: 'history',
    labelKey: 'cvBuilder.coach.stepNames.history',
    done: (cv) => (cv.experience?.length || 0) > 0,
  },
  {
    id: 'projects',
    labelKey: 'cvBuilder.coach.stepNames.projects',
    done: (cv) => (cv.projects?.length || 0) > 0,
  },
  {
    id: 'education',
    labelKey: 'cvBuilder.coach.stepNames.education',
    done: (cv) => (cv.education?.length || 0) > 0,
  },
  {
    id: 'skills',
    labelKey: 'cvBuilder.coach.stepNames.skills',
    done: (cv) => (cv.skills?.length || 0) > 0,
  },
  {
    id: 'summary',
    labelKey: 'cvBuilder.coach.stepNames.summary',
    done: (cv) => !!cv.professionalSummary?.trim(),
  },
];

export function getSectionProgress(t, cvData = {}) {
  const remaining = BUILDING_STEPS.filter((s) => !s.done(cvData)).map((s) => t(s.labelKey));
  const done = BUILDING_STEPS.length - remaining.length;
  return { done, total: BUILDING_STEPS.length, remaining, allDone: remaining.length === 0 };
}

// Count bullets and how many carry a number, so history/projects coaching can
// react to quantification the same way the health check does.
const bulletStats = (entries = []) => {
  const bullets = entries.flatMap((e) => (e.description || '').split('\n').filter((b) => b.trim()));
  const quantified = bullets.filter((b) => /\d/.test(b)).length;
  return { count: bullets.length, quantified };
};

// First name to greet the user by, ignoring the "Candidate" placeholder.
export function firstNameOf(cvData = {}) {
  const raw = (cvData?.personalInfo?.fullName || '').trim().split(/\s+/)[0] || '';
  return raw && raw.toLowerCase() !== 'candidate' ? raw : '';
}

/**
 * Instant, deterministic step coaching — the fallback shown while the AI coach
 * loads, or when it's rate-limited / unavailable. Personalised with the user's
 * first name so even the fallback feels like a real coach.
 * @returns {{ title, message, tips: string[], tone: 'start'|'progress'|'win' }}
 */
export function getStepCoaching(t, stepId, cvData = {}) {
  const base = baseStepCoaching(t, stepId, cvData);
  const name = firstNameOf(cvData);
  if (!name || base.message.startsWith(name) || base.message.startsWith('Hey ')) return base;
  return { ...base, message: t('cvBuilder.coach.heyName', { name, message: base.message }) };
}

function baseStepCoaching(t, stepId, cvData = {}) {
  const cv = cvData;
  const S = 'cvBuilder.coach.steps';
  // What Aria "remembers" from the Target step — lets later steps reference the
  // specific role/keywords the student shared, so the coach reads as one
  // conversation. Guarded: if they skipped the JD these are empty and copy stays generic.
  const hasTarget = !!(cv.targetJob?.description || '').trim();
  const targetKws = (cv.targetJob?.keywords || []).filter(Boolean).slice(0, 3);
  const kwList =
    targetKws.length === 0
      ? ''
      : targetKws.length === 1
        ? targetKws[0]
        : t('cvBuilder.coach.kwListJoin', {
            head: targetKws.slice(0, -1).join(', '),
            tail: targetKws[targetKws.length - 1],
          });
  switch (stepId) {
    case 'target_job': {
      const hasTitle = !!cv.targetJob?.title?.trim();
      const hasDesc = !!cv.targetJob?.description?.trim();
      if (!hasTitle) {
        return {
          title: t(`${S}.target_job.empty.title`),
          message: t(`${S}.target_job.empty.message`),
          tips: [t(`${S}.target_job.empty.tips.0`), t(`${S}.target_job.empty.tips.1`)],
          tone: 'start',
        };
      }
      if (!hasDesc) {
        return {
          title: t(`${S}.target_job.titled.title`, { title: cv.targetJob.title }),
          message: t(`${S}.target_job.titled.message`),
          tips: [t(`${S}.target_job.titled.tips.0`)],
          tone: 'progress',
        };
      }
      return {
        title: t(`${S}.target_job.complete.title`),
        message: t(`${S}.target_job.complete.message`),
        tips: [t(`${S}.target_job.complete.tips.0`)],
        tone: 'win',
      };
    }

    case 'heading': {
      const info = cv.personalInfo || {};
      const have = ['fullName', 'email', 'phone', 'linkedin'].filter((k) => info[k]);
      if (have.length <= 1) {
        return {
          title: t(`${S}.heading.empty.title`),
          message: t(`${S}.heading.empty.message`),
          tips: [t(`${S}.heading.empty.tips.0`), t(`${S}.heading.empty.tips.1`)],
          tone: 'start',
        };
      }
      if (have.length < 4) {
        return {
          title: t(`${S}.heading.partial.title`),
          message: t(`${S}.heading.partial.message`),
          tips: [
            !info.phone && t(`${S}.heading.partial.tipPhone`),
            !info.linkedin && t(`${S}.heading.partial.tipLinkedin`),
          ].filter(Boolean),
          tone: 'progress',
        };
      }
      return {
        title: t(`${S}.heading.complete.title`),
        message: t(`${S}.heading.complete.message`),
        tips: [],
        tone: 'win',
      };
    }

    case 'history': {
      const exp = cv.experience || [];
      const { count, quantified } = bulletStats(exp);
      if (exp.length === 0) {
        return {
          title: t(`${S}.history.empty.title`),
          message: hasTarget
            ? t(`${S}.history.empty.message_targeted`)
            : t(`${S}.history.empty.message_untargeted`),
          tips: [t(`${S}.history.empty.tips.0`), t(`${S}.history.empty.tips.1`)],
          tone: 'start',
        };
      }
      if (count > 0 && quantified / count < 0.3) {
        return {
          title: t(`${S}.history.needsNumbers.title`),
          message: t(`${S}.history.needsNumbers.message`, { count: exp.length }),
          tips: [t(`${S}.history.needsNumbers.tips.0`), t(`${S}.history.needsNumbers.tips.1`)],
          tone: 'progress',
        };
      }
      return {
        title: t(`${S}.history.complete.title`),
        message: t(`${S}.history.complete.message`),
        tips: [],
        tone: 'win',
      };
    }

    case 'projects': {
      const projects = cv.projects || [];
      if (projects.length === 0) {
        return {
          title: t(`${S}.projects.empty.title`),
          message: t(`${S}.projects.empty.message`),
          tips: [t(`${S}.projects.empty.tips.0`), t(`${S}.projects.empty.tips.1`)],
          tone: 'start',
        };
      }
      return {
        title: t(`${S}.projects.complete.title`),
        message: t(`${S}.projects.complete.message`),
        tips: [],
        tone: 'win',
      };
    }

    case 'education': {
      const edu = cv.education || [];
      if (edu.length === 0) {
        return {
          title: t(`${S}.education.empty.title`),
          message: t(`${S}.education.empty.message`),
          tips: [t(`${S}.education.empty.tips.0`)],
          tone: 'start',
        };
      }
      return {
        title: t(`${S}.education.complete.title`),
        message: t(`${S}.education.complete.message`),
        tips: [],
        tone: 'win',
      };
    }

    case 'skills': {
      const skills = cv.skills || [];
      if (skills.length < 4) {
        return {
          title: t(`${S}.skills.empty.title`),
          message: kwList
            ? t(`${S}.skills.empty.message_withKeywords`, { kwList })
            : hasTarget
              ? t(`${S}.skills.empty.message_targeted`)
              : t(`${S}.skills.empty.message_generic`),
          tips: [t(`${S}.skills.empty.tips.0`), t(`${S}.skills.empty.tips.1`)],
          tone: 'start',
        };
      }
      if (skills.length < 8) {
        return {
          title: t(`${S}.skills.partial.title`),
          message: kwList
            ? t(`${S}.skills.partial.message_withKeywords`, { count: skills.length, kwList })
            : t(`${S}.skills.partial.message_generic`, { count: skills.length }),
          tips: [t(`${S}.skills.partial.tips.0`)],
          tone: 'progress',
        };
      }
      return {
        title: t(`${S}.skills.complete.title`),
        message: t(`${S}.skills.complete.message`),
        tips: [],
        tone: 'win',
      };
    }

    case 'summary': {
      const summary = (cv.professionalSummary || '').trim();
      if (summary.length === 0) {
        return {
          title: t(`${S}.summary.empty.title`),
          message: hasTarget
            ? t(`${S}.summary.empty.message_targeted`)
            : t(`${S}.summary.empty.message_untargeted`),
          tips: [t(`${S}.summary.empty.tips.0`), t(`${S}.summary.empty.tips.1`)],
          tone: 'start',
        };
      }
      if (summary.length < 100) {
        return {
          title: t(`${S}.summary.partial.title`),
          message: t(`${S}.summary.partial.message`),
          tips: [t(`${S}.summary.partial.tips.0`)],
          tone: 'progress',
        };
      }
      return {
        title: t(`${S}.summary.complete.title`),
        message: t(`${S}.summary.complete.message`),
        tips: [],
        tone: 'win',
      };
    }

    // Review/finalize — the finish line, NOT a section to review. Give a holistic
    // wrap-up: at 100% celebrate + point onward; otherwise name the single most
    // impactful blocker (the first incomplete required section + its first unmet
    // requirement) so the user knows exactly what stands between them and done.
    // Deterministic from CV Health, so it updates live as they fix things.
    case 'finalize': {
      const { score, sections } = computeCvHealth(t, cv);
      const first = (cv.personalInfo?.fullName || '').trim().split(/\s+/)[0];
      const hasName = !!(first && first.toLowerCase() !== 'candidate');
      const incomplete = sections.filter((s) => !s.recommended && s.status !== 'complete');

      if (incomplete.length === 0) {
        return {
          title: t(`${S}.finalize.complete.title`),
          message: hasName
            ? t(`${S}.finalize.complete.message_withName`, { name: first })
            : t(`${S}.finalize.complete.message_noName`),
          tips: [],
          tone: 'win',
        };
      }

      const main = incomplete[0];
      const unmetIdx = (main.requirements || []).findIndex((r) => !r.met);
      const need =
        unmetIdx >= 0
          ? t(`cvBuilder.coach.finalize.needs.${main.id}.${unmetIdx}`)
          : t('cvBuilder.coach.finalize.needs.fallback');
      const left = t(`${S}.finalize.progress.left`, {
        count: incomplete.length,
        section: main.title,
        need,
      });
      return {
        title: t(`${S}.finalize.progress.title`),
        message: hasName
          ? t(`${S}.finalize.progress.message_withName`, { name: first, score, left })
          : t(`${S}.finalize.progress.message_noName`, { score, left }),
        tips: [],
        tone: 'progress',
      };
    }

    default:
      return {
        title: t(`${S}.default.title`),
        message: t(`${S}.default.message`),
        tips: [],
        tone: 'start',
      };
  }
}

// Sections the coach can give real QUALITATIVE feedback on — only these get a
// "done — how's it look?" hand-off. Contact (typed fields) and Education
// (structured entries) are excluded: there's nothing to "review", the journey
// already tracks whether they're filled.
const FEEDBACK_SECTIONS = {
  history: 'Work History',
  projects: 'Projects',
  skills: 'Skills',
  summary: 'Summary',
};

/**
 * Quick replies the user can hand TO the coach on the current step (explicit
 * actions — they NEVER fire the AI on their own; only on a click). The Target Job
 * is context the coach needs, so it gets a "have you got a JD?" hand-off; the
 * feedback-worthy sections get a "done — how's it look?" so the user can ask for
 * feedback on demand. Each returns a `signal` string the coach acknowledges.
 *
 * Currently unreferenced anywhere in the CV Builder — kept as-is (untranslated)
 * until a caller resurfaces it.
 */
export function getQuickReplies(stepId) {
  if (stepId === 'target_job') {
    return {
      kind: 'jd',
      replies: [
        {
          label: '✓ I’ve added the description',
          signal: "I've added the job description for the role I'm targeting.",
          // After the coach acknowledges, a Recheck button appears so the user can
          // re-notify it if they edit the JD (we never auto-detect the change).
          recheck: true,
        },
        { label: 'I don’t have one yet', signal: "I don't have a job description for this role." },
      ],
      recheckSignal: "I've updated the job description — please take another look.",
    };
  }
  const section = FEEDBACK_SECTIONS[stepId];
  if (section) {
    return {
      kind: 'review',
      replies: [
        {
          label: '✓ I’m done — how’s it look?',
          signal: `I've finished my ${section} section — how does it look?`,
        },
      ],
      recheckSignal: `I've made changes — please recheck my ${section} section.`,
      ignoreSignal: `I'll leave my ${section} section as is for now.`,
    };
  }
  return { kind: null, replies: [] };
}

// Human label for the step the user is on (matches the coaching copy above).
// NOTE: getBotNudge below (the only consumer) is dead code — grepped with no
// callers anywhere in the frontend — so this stays as plain English rather than
// threading a `t` this module doesn't otherwise need.
const STEP_LABELS = {
  target_job: 'Target Job',
  heading: 'Heading',
  history: 'Work History',
  projects: 'Projects',
  education: 'Education',
  skills: 'Skills',
  summary: 'Summary',
  finalize: 'CV',
};

// Tiny generic motivation pool, used only when the step has no state-aware tip
// of its own. Short enough to fit the floating bubble. English-only for the same
// reason as STEP_LABELS above (only consumer is dead code); the translated copy
// already exists at cvBuilder.coach.genericTips.{0..3} if getBotNudge is revived.
const GENERIC_TIPS = [
  'Strong verbs win — Led, Built, Shipped, Grew 💪',
  'Numbers make bullets pop — try adding one 📈',
  'Mirror the wording in the job post 🧩',
  'One clear win beats three vague duties ✨',
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * A short, proactive one-liner the floating mobile bot "says" a few seconds after
 * the user lands on a step. Deterministic + client-side (no AI, no network), so
 * it's free for everyone. Adapts to whether the step's criteria are already met,
 * and sprinkles in a short motivation tip at random.
 *
 * Unreferenced anywhere in the CV Builder as of this audit — left untranslated
 * (English-only) rather than spending translation effort on unreachable strings.
 * If a caller resurfaces this, it'll need `getStepCoaching` updated to take `t`.
 *
 * @param {string} stepId       current builder step id
 * @param {object} cvData       live CV data (for the name + tip state-awareness)
 * @param {{ isComplete?: boolean, firstTime?: boolean }} opts
 * @returns {string} one line, ≤ ~90 chars
 */
export function getBotNudge(stepId, cvData = {}, { isComplete = false, firstTime = false } = {}) {
  const name = firstNameOf(cvData);
  const label = STEP_LABELS[stepId] || 'CV';

  // First hello of the session — a one-off greeting so the bot introduces itself.
  if (firstTime) {
    return `Hey${name ? ` ${name}` : ''}! I'm your ATS coach 🤖 — tap me anytime and we'll polish your CV together.`;
  }

  if (stepId === 'finalize') {
    return "Your CV's ready 🎉 — tap me and let's give it one last review together.";
  }

  // Roughly 1-in-3 nudges is a motivation tip rather than a review invite. Prefer
  // the step's own state-aware tip (already short + ordered by importance).
  if (Math.random() < 0.34) {
    const stepTip = getStepCoaching(null, stepId, cvData)?.tips?.[0];
    return stepTip || pick(GENERIC_TIPS);
  }

  if (isComplete) {
    return pick([
      `Your ${label} looks done — tap me and let's review it together ✅`,
      `Nice, ${label} sorted! Want me to check it over? 🎯`,
    ]);
  }

  return pick([
    `Take your time — ping me when you're done with your ${label} and we'll review it together 👀`,
    `Working on your ${label}? I'm right here when you want a second pair of eyes 🙌`,
  ]);
}
