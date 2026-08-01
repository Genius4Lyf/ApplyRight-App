// Structural shape of the curated "what research says" content — one lecture card
// per builder step. Keyed by the step id (see STEPS in CVContext). Rendered by
// ResearchCard, triggered by the "📖 What research says" starter chip.
//
// The actual copy lives in the locale files under `cvBuilder.sectionResearch.<stepId>`
// (eyebrow/thesis/points.<n>/before/after/example/source) — this module only holds
// the per-section SHAPE (icon + how many points + which optional fields exist), since
// that shape is structural, not translatable. `points` are trusted static markup
// (rendered via dangerouslySetInnerHTML) so translated <b> tags are safe the same way.
export const SECTION_RESEARCH = {
  target_job: { icon: '🎯', pointCount: 3, hasExample: true },
  heading: { icon: '📇', pointCount: 4, hasExample: true },
  history: { icon: '📈', pointCount: 4, hasBeforeAfter: true },
  projects: { icon: '🛠️', pointCount: 5, hasExample: true },
  education: { icon: '🎓', pointCount: 4, hasExample: true },
  skills: { icon: '🧰', pointCount: 4, hasExample: true },
  summary: { icon: '✍️', pointCount: 4, hasExample: true },
  finalize: { icon: '✅', pointCount: 4 },
};
