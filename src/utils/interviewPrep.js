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
