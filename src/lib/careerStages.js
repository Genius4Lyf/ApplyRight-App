// Career-stage vocabulary — the single source of truth shared by the summary flow
// (AriaChat) and the work-history build-with surfaces (AskAriaGenerate, SectionCoach).
// `k` maps 1:1 to the backend stage enum ('grad'|'experienced'|'changer'); the backend
// forks its coaching on it (entry-level 'grad' is eased in — no metric pressure).
export const CAREER_STAGES = [
  { k: 'grad', label: 'Student / recent grad', labelKey: 'ariaStudio.chat.careerStage.options.grad' },
  { k: 'experienced', label: 'Experienced', labelKey: 'ariaStudio.chat.careerStage.options.experienced' },
  { k: 'changer', label: 'Changing careers', labelKey: 'ariaStudio.chat.careerStage.options.changer' },
];

// One lightweight question shown once at the start of work-history build-with — a
// context selector, NOT a gate: typing an answer proceeds fine (the backend infers).
export const CAREER_STAGE_PROMPT = 'Where are you in your career?';

export const isCareerStage = (k) => CAREER_STAGES.some((s) => s.k === k);
