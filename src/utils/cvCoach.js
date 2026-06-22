// Dynamic, step-aware coaching for the ATS Coach panel. Deterministic (no AI, no
// network) so it reacts instantly as the user types and moves between steps. The
// goal is to feel like a coach sitting beside the user — guiding what to do on
// THIS step, reacting to what they've actually entered, and building confidence —
// not just ticking "section present / absent" boxes.

// The seven building steps (Review/finalize is excluded — there the panel
// switches to a live preview). Used for the "sections complete" progress that
// teases the preview waiting at Review.
const BUILDING_STEPS = [
  { id: 'target_job', label: 'Target Job', done: (cv) => !!cv.targetJob?.title?.trim() },
  { id: 'heading', label: 'Heading', done: (cv) => !!cv.personalInfo?.fullName },
  { id: 'history', label: 'Work History', done: (cv) => (cv.experience?.length || 0) > 0 },
  { id: 'projects', label: 'Projects', done: (cv) => (cv.projects?.length || 0) > 0 },
  { id: 'education', label: 'Education', done: (cv) => (cv.education?.length || 0) > 0 },
  { id: 'skills', label: 'Skills', done: (cv) => (cv.skills?.length || 0) > 0 },
  { id: 'summary', label: 'Summary', done: (cv) => !!cv.professionalSummary?.trim() },
];

export function getSectionProgress(cvData = {}) {
  const remaining = BUILDING_STEPS.filter((s) => !s.done(cvData)).map((s) => s.label);
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
export function getStepCoaching(stepId, cvData = {}) {
  const base = baseStepCoaching(stepId, cvData);
  const name = firstNameOf(cvData);
  if (!name || base.message.startsWith(name) || base.message.startsWith('Hey ')) return base;
  return { ...base, message: `Hey ${name} — ${base.message}` };
}

function baseStepCoaching(stepId, cvData = {}) {
  const cv = cvData;
  switch (stepId) {
    case 'target_job': {
      const hasTitle = !!cv.targetJob?.title?.trim();
      const hasDesc = !!cv.targetJob?.description?.trim();
      if (!hasTitle) {
        return {
          title: "Let's aim at a target 🎯",
          message:
            "Start by telling me the role you want. Paste the job description too — I'll use it to coach every other section toward exactly what this employer is scanning for.",
          tips: [
            'Use the real job title from the posting (e.g. "Frontend Engineer", not "Coder").',
            'Pasting the full description unlocks keyword matching later.',
          ],
          tone: 'start',
        };
      }
      if (!hasDesc) {
        return {
          title: `Aiming for ${cv.targetJob.title} 👍`,
          message:
            "Great choice. Now paste the job description — that's what lets me match your CV to the exact keywords recruiters and ATS look for.",
          tips: [
            'No description handy? You can still build a strong general CV and add one later.',
          ],
          tone: 'progress',
        };
      }
      return {
        title: 'Target locked in ✅',
        message:
          "Perfect — I've got the role and the description. From here, everything you write gets coached toward landing this specific job.",
        tips: ['Next: your heading. Let’s make you easy to reach.'],
        tone: 'win',
      };
    }

    case 'heading': {
      const info = cv.personalInfo || {};
      const have = ['fullName', 'email', 'phone', 'linkedin'].filter((k) => info[k]);
      if (have.length <= 1) {
        return {
          title: 'First impressions count 👋',
          message:
            'The very top of your CV is the first thing a recruiter reads. Let’s make sure they can reach you in seconds.',
          tips: [
            'Name, email and phone are the essentials.',
            'Add your LinkedIn — recruiters almost always check it.',
          ],
          tone: 'start',
        };
      }
      if (have.length < 4) {
        return {
          title: 'Looking reachable 📇',
          message:
            'Nice. A couple more details and recruiters will have every way they need to contact you.',
          tips: [
            !info.phone && 'Add a phone number.',
            !info.linkedin && 'Add your LinkedIn URL.',
          ].filter(Boolean),
          tone: 'progress',
        };
      }
      return {
        title: 'Contact details nailed ✅',
        message: 'You’re easy to reach — exactly what a recruiter wants. On to your experience.',
        tips: [],
        tone: 'win',
      };
    }

    case 'history': {
      const exp = cv.experience || [];
      const { count, quantified } = bulletStats(exp);
      if (exp.length === 0) {
        return {
          title: 'This is the heart of your CV ❤️',
          message:
            'Your work experience carries the most weight. Add a role and let’s make each bullet earn its place — you’ve got real wins to show.',
          tips: [
            'Lead every bullet with a strong action verb: Led, Built, Grew, Shipped.',
            'Avoid "Responsible for…" — show the result, not the duty.',
          ],
          tone: 'start',
        };
      }
      if (count > 0 && quantified / count < 0.3) {
        return {
          title: 'Strong start — now add numbers 📈',
          message: `You've got ${exp.length} role${exp.length > 1 ? 's' : ''} down. The single biggest upgrade now: put numbers on your wins. "Grew signups 40%" beats "Grew signups" every time.`,
          tips: [
            'Quantify with %, ₦/$, time saved, or volume handled.',
            'Even rough numbers ("~500 users") beat none.',
          ],
          tone: 'progress',
        };
      }
      return {
        title: 'Now that’s a results CV 🔥',
        message:
          'Your bullets lead with action and back it with numbers — this is exactly what gets you shortlisted. Keep that standard for every role.',
        tips: [],
        tone: 'win',
      };
    }

    case 'projects': {
      const projects = cv.projects || [];
      if (projects.length === 0) {
        return {
          title: 'Projects prove you can do it 🛠️',
          message:
            'Projects are powerful — especially if your experience is still growing. They show initiative and real, hands-on skill.',
          tips: [
            'Name what you built and the impact or outcome.',
            'Link to it (GitHub, live demo) if you can.',
          ],
          tone: 'start',
        };
      }
      return {
        title: 'Great — projects add proof ✅',
        message:
          'These show you don’t just talk about skills, you apply them. That builds real confidence with hiring teams.',
        tips: [],
        tone: 'win',
      };
    }

    case 'education': {
      const edu = cv.education || [];
      if (edu.length === 0) {
        return {
          title: 'Add your qualifications 🎓',
          message:
            'Many ATS filter by degree before a human ever looks. List your education — and don’t worry if it’s not a perfect match for the role; it still counts.',
          tips: ['Include the school, qualification and year.'],
          tone: 'start',
        };
      }
      return {
        title: 'Education in place ✅',
        message:
          'Good — that clears a common automated filter. You’re building a complete picture.',
        tips: [],
        tone: 'win',
      };
    }

    case 'skills': {
      const skills = cv.skills || [];
      if (skills.length < 4) {
        return {
          title: 'Skills are the ATS’s matching ground 🧩',
          message:
            'This section is where keyword matching happens. List the tools and technologies from the job description that you genuinely have — aim for 8 or more.',
          tips: [
            'Mirror the wording in the job post (e.g. "JavaScript" if that’s what they wrote).',
            'Only list skills you can speak to in an interview.',
          ],
          tone: 'start',
        };
      }
      if (skills.length < 8) {
        return {
          title: 'Good list — push for a few more 💪',
          message: `You've listed ${skills.length}. A handful more relevant skills means more of the job's keywords matched. Scan the description for any you missed.`,
          tips: ['Aim for 8-12 genuine, relevant skills.'],
          tone: 'progress',
        };
      }
      return {
        title: 'Skills section is strong ✅',
        message:
          'A rich, relevant skills list — that’s what gets you past keyword screening. Nicely done.',
        tips: [],
        tone: 'win',
      };
    }

    case 'summary': {
      const summary = (cv.professionalSummary || '').trim();
      if (summary.length === 0) {
        return {
          title: 'Your headline pitch 🎤',
          message:
            'Three or four punchy sentences: who you are, your strongest proof, and what you’re aiming for. I’ll tell you the moment it’s strong enough.',
          tips: [
            'Open with your role and years of experience.',
            'Drop in one standout achievement.',
          ],
          tone: 'start',
        };
      }
      if (summary.length < 100) {
        return {
          title: 'Good — give it a little more 📝',
          message:
            'You’ve started your pitch. Expand it to 3-4 sentences so it gives recruiters (and the ATS) more to grab onto.',
          tips: ['Add what you’re aiming for and one proof point.'],
          tone: 'progress',
        };
      }
      return {
        title: 'That’s a sharp summary ✅',
        message:
          'Strong, specific and the right length. You’ve done the hard part — head to Review to see it all come together.',
        tips: [],
        tone: 'win',
      };
    }

    default:
      return {
        title: 'Let’s build a CV that lands interviews 🚀',
        message:
          'Work through each section and I’ll coach you as you go. Watch your CV Health climb — when every section’s done, a full preview is waiting at Review.',
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
