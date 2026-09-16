// Structural shape of the illustrated brief shown BEFORE a build section opens — one per
// section the user has to walk into cold. Keyed by the section token StudioChat's section
// hub yields (`nextSection.key`), which is why projects appear here as 'project' SINGULAR.
//
// Same split as sectionResearch.js: this module holds only what is structural (which
// artwork, how many rule bullets, which optional fields exist). Copy lives in the locale
// files, and is drawn from TWO places on purpose:
//
//   - `research` points at an entry in `cvBuilder.sectionResearch.*`, the curated,
//     research-grounded lecture corpus that already exists and is already translated.
//     Its step ids are the CV-builder's, not the Studio's, so 'experience' reads the
//     'history' entry — that mapping is the whole reason this field exists.
//   - the rest reads `ariaStudio.sectionIntro.<key>.*`, which carries only the two angles
//     the research corpus has no room for: what the section actually IS in one sentence,
//     and how to get the best out of Aria inside it.
//
// `research` is OPTIONAL. `career_stage` is not a CV section and has no entry in the
// corpus, so its brief is carried entirely by the copy below — the brief renders whatever
// it is given and skips what it is not.
//
// `types` names an option family to explain in the brief. For the CV sections that is
// explanation only, because the pickers keep their own place further in; for career stage
// the buttons are right there on the same card, so the rows are explaining a choice the
// user is about to make rather than one they will meet later.
export const SECTION_INTRO = {
  // Not a section — the question asked before the build starts. It earns a brief because
  // the answer silently re-coaches every section after it, and nothing on screen said so.
  career_stage: { art: 'career-stage', types: 'careerStage' },
  target_job: { research: 'target_job', art: 'target-job' },
  experience: { research: 'history', art: 'experience', types: 'experience' },
  project: { research: 'projects', art: 'projects', types: 'project' },
  education: { research: 'education', art: 'education' },
  skills: { research: 'skills', art: 'skills' },
  summary: { research: 'summary', art: 'summary' },
};

// The five experience kinds, in the order ExperienceTypeCard offers them. Held here rather
// than imported from that component so the brief cannot drift out of sync with the picker
// it is preparing people for.
export const EXPERIENCE_TYPES = ['job', 'internship', 'partTime', 'volunteer', 'coursework'];

export const introFor = (section) => SECTION_INTRO[section] || null;
