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
