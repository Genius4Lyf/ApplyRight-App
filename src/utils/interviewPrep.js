export const getPrepId = (application) => application?._id || application?.applicationId || null;

export const getInterviewPrep = (application) => application?.interviewPrep || {};

export const getJobQuestions = (application) => {
  const prepQuestions = getInterviewPrep(application).jobQuestions;
  if (Array.isArray(prepQuestions) && prepQuestions.length > 0) return prepQuestions;

  const legacyQuestions = application?.interviewQuestions;
  if (!Array.isArray(legacyQuestions)) return [];

  return legacyQuestions.map((q) =>
    typeof q === 'string' ? { question: q } : { ...q, suggestedAnswer: q.suggestedAnswer || '' }
  );
};

export const getQuestionsToAsk = (application) => {
  const prepQuestions = getInterviewPrep(application).questionsToAsk;
  if (Array.isArray(prepQuestions) && prepQuestions.length > 0) return prepQuestions;
  return Array.isArray(application?.questionsToAsk) ? application.questionsToAsk : [];
};

export const getSkillPrep = (application) => {
  const skills = getInterviewPrep(application).skillsWithEvidence;
  return Array.isArray(skills) ? skills : [];
};

export const getStories = (application) => {
  const stories = getInterviewPrep(application).stories;
  return Array.isArray(stories) ? stories : [];
};

const CONF_RANK = { needs_work: 1, almost: 2, ready: 3 };

// Trend across recent Interview Mode runs — powers the "desensitization" message
// (your nerves ease with reps). Reads interviewPrep.interviewHistory (last ~10);
// falls back to the single lastInterviewSession so one run still counts.
// Returns { count, trend: 'up'|'flat'|'down', firstConfidence, lastConfidence }.
export const getInterviewTrend = (application) => {
  const prep = getInterviewPrep(application);
  let history = Array.isArray(prep.interviewHistory) ? prep.interviewHistory : [];
  if (history.length === 0 && prep.lastInterviewSession?.completedAt) {
    history = [prep.lastInterviewSession];
  }
  const withConf = history.filter((h) => h && h.confidence);
  const firstConfidence = withConf[0]?.confidence || null;
  const lastConfidence = withConf[withConf.length - 1]?.confidence || null;
  let trend = 'flat';
  if (firstConfidence && lastConfidence) {
    const delta = (CONF_RANK[lastConfidence] || 0) - (CONF_RANK[firstConfidence] || 0);
    trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  }
  return { count: history.length, trend, firstConfidence, lastConfidence };
};

export const hasInterviewPrep = (application) =>
  getJobQuestions(application).length > 0 ||
  getQuestionsToAsk(application).length > 0 ||
  getSkillPrep(application).length > 0 ||
  getStories(application).length > 0;

export const getPrepSummary = (application) => {
  const questionCount = getJobQuestions(application).length;
  const skillCount = getSkillPrep(application).length;
  const askCount = getQuestionsToAsk(application).length;
  const storyCount = getStories(application).length;
  const parts = [];

  if (storyCount > 0) {
    parts.push(`${storyCount} stor${storyCount === 1 ? 'y' : 'ies'}`);
  }
  if (questionCount > 0) {
    parts.push(`${questionCount} question${questionCount === 1 ? '' : 's'}`);
  }
  if (skillCount > 0) {
    parts.push(`${skillCount} skill${skillCount === 1 ? '' : 's'} with talking points`);
  }
  if (parts.length === 0 && askCount > 0) {
    parts.push(`${askCount} question${askCount === 1 ? '' : 's'} to ask`);
  }

  return parts.join(' · ');
};

// Per-confidence point values for the readiness score. Unrated counts as 0 —
// being unprepared genuinely lowers readiness, and it nudges the user to rate.
const CONFIDENCE_POINTS = { ready: 100, almost: 60, needs_work: 25 };

// Compute the readiness summary from the things the user actively prepares:
// job questions + stories. Skills are a reference layer (auto-surfaced, unrated),
// so they're deliberately excluded — otherwise auto-surfacing them would tank the
// score with a pile of "unrated" items. Pure — no API calls, no side effects.
export const computeReadiness = (application) => {
  const questions = getJobQuestions(application);
  const stories = getStories(application);

  const items = [...questions.map((q) => q.confidence), ...stories.map((s) => s.confidence)];

  const counts = { ready: 0, almost: 0, needs_work: 0, unrated: 0 };
  let sum = 0;
  items.forEach((c) => {
    if (c === 'ready' || c === 'almost' || c === 'needs_work') {
      counts[c] += 1;
      sum += CONFIDENCE_POINTS[c];
    } else {
      counts.unrated += 1;
    }
  });

  const total = items.length;
  const rated = total - counts.unrated;
  const score = total ? Math.round(sum / total) : 0;

  const weakQuestionIndices = questions
    .map((q, i) => (q.confidence === 'ready' ? null : i))
    .filter((i) => i !== null);

  const prep = getInterviewPrep(application);
  const flaggedCount =
    (Array.isArray(prep.fabricationWarnings) ? prep.fabricationWarnings.length : 0) +
    (Array.isArray(prep.storyFabricationWarnings) ? prep.storyFabricationWarnings.length : 0);

  let nextAction;
  if (total === 0) {
    nextAction = { kind: 'generate', label: 'Generate prep to get started' };
  } else if (counts.unrated > 0) {
    nextAction = {
      kind: 'rate',
      label: `Review ${counts.unrated} item${counts.unrated === 1 ? '' : 's'} you haven't rated`,
    };
  } else if (counts.needs_work > 0) {
    nextAction = {
      kind: 'revisit',
      label: `Revisit ${counts.needs_work} weak answer${counts.needs_work === 1 ? '' : 's'}`,
    };
  } else if (flaggedCount > 0) {
    nextAction = {
      kind: 'verify',
      label: `Verify ${flaggedCount} flagged claim${flaggedCount === 1 ? '' : 's'}`,
    };
  } else {
    nextAction = { kind: 'done', label: "You're interview-ready" };
  }

  return { total, rated, counts, score, weakQuestionIndices, flaggedCount, nextAction };
};

// Does the user have a note covering their weakness / growth area? Same signal
// ReadinessOverview uses — a note whose title or body mentions it. Drafting one
// is the "have a weakness answer ready" prep task.
const hasWeaknessNote = (application) => {
  const notes = Array.isArray(application?.interviewPrep?.userNotes)
    ? application.interviewPrep.userNotes
    : [];
  return notes.some(
    (n) =>
      n?.title?.toLowerCase().includes('weakness') ||
      n?.title?.toLowerCase().includes('growth area') ||
      (typeof n?.body === 'string' && n.body.toLowerCase().includes('weakness'))
  );
};

// Hard gate for STARTING an interview. The interview is the reward at the end of
// an "interview readiness" checklist — finishing the prep tasks unlocks it, which
// gamifies preparation and pushes the user to do the work that earns a high score.
//
// Job-linked prep requires the full set: generate prep (questions) + a pitch
// ("Tell me about yourself") + "Why this role" + a drafted weakness + questions to
// ask the interviewer + at least one STAR story. CV-only (draft) prep has no
// job-context fields (no jobQuestions/questionsToAsk, no generatable essentials —
// see DraftCV.js + InterviewPrepDetail's `onGenerateEssential` gating), so it only
// requires the achievable tasks: a drafted weakness + a STAR story. Pure — no
// side effects.
export const computeInterviewGate = (application) => {
  const questions = getJobQuestions(application);
  const stories = getStories(application);
  const asks = getQuestionsToAsk(application);
  const isCvOnly =
    application?.source === 'draft' || (!application?.jobId && !application?.jobTitle);

  const hasType = (t) => questions.some((q) => (q.type || '').toLowerCase() === t);

  const tasks = [];

  // `labelKey`/`hintKey` resolve via t() at render (InterviewReadinessChecklist,
  // InterviewPrepDetail) — this module has no react-i18next context of its own.
  if (!isCvOnly) {
    tasks.push(
      {
        key: 'questions',
        labelKey: 'interviewPrep.gate.tasks.questions.label',
        hintKey: 'interviewPrep.gate.tasks.questions.hint',
        tab: 'questions',
        done: questions.length > 0,
      },
      {
        key: 'pitch',
        labelKey: 'interviewPrep.gate.tasks.pitch.label',
        hintKey: 'interviewPrep.gate.tasks.pitch.hint',
        tab: 'questions',
        done: hasType('intro'),
      },
      {
        key: 'motivation',
        labelKey: 'interviewPrep.gate.tasks.motivation.label',
        hintKey: 'interviewPrep.gate.tasks.motivation.hint',
        tab: 'questions',
        done: hasType('motivation'),
      }
    );
  }

  tasks.push({
    key: 'weakness',
    labelKey: 'interviewPrep.gate.tasks.weakness.label',
    hintKey: 'interviewPrep.gate.tasks.weakness.hint',
    tab: 'notes',
    done: hasWeaknessNote(application),
  });

  if (!isCvOnly) {
    tasks.push({
      key: 'asks',
      labelKey: 'interviewPrep.gate.tasks.asks.label',
      hintKey: 'interviewPrep.gate.tasks.asks.hint',
      tab: 'questions',
      done: asks.length > 0,
    });
  }

  tasks.push({
    key: 'story',
    labelKey: 'interviewPrep.gate.tasks.story.label',
    hintKey: 'interviewPrep.gate.tasks.story.hint',
    tab: 'stories',
    done: stories.length > 0,
  });

  const doneCount = tasks.filter((t) => t.done).length;
  const requiredCount = tasks.length;
  const unlocked = doneCount === requiredCount;
  const pct = requiredCount ? Math.round((doneCount / requiredCount) * 100) : 100;
  const nextTask = tasks.find((t) => !t.done) || null;

  return { tasks, doneCount, requiredCount, unlocked, pct, nextTask, isCvOnly };
};

export const mergeInterviewPrepResponse = (application, payload) => {
  const existingPrep = getInterviewPrep(application);
  const incomingPrep = payload?.interviewPrep || {};
  const jobQuestions =
    incomingPrep.jobQuestions || payload?.jobQuestions || existingPrep.jobQuestions || [];
  const questionsToAsk =
    incomingPrep.questionsToAsk || payload?.questionsToAsk || existingPrep.questionsToAsk || [];

  return {
    ...application,
    ...payload,
    interviewPrep: {
      ...existingPrep,
      ...incomingPrep,
      jobQuestions,
      questionsToAsk,
    },
    interviewQuestions:
      payload?.interviewQuestions ||
      jobQuestions.map((q) => ({ type: q.type, question: q.question })),
    questionsToAsk,
  };
};
