// Curated, research-grounded "what research says" content — one lecture card per
// builder step. Keyed by the step id (see STEPS in CVContext). Rendered by
// ResearchCard, triggered by the "📖 What research says" starter chip. `points`
// contain trusted static <b> markup (rendered via dangerouslySetInnerHTML).
export const SECTION_RESEARCH = {
  target_job: {
    icon: '🎯',
    eyebrow: 'Target job',
    thesis: 'Set the target and everything aims at it — tailoring is what beats the ATS.',
    points: [
      "The ATS matches the job's <b>exact keywords</b> — a set target lets Aria weave them in.",
      'Tailored CVs get read; generic ones get filtered out.',
      'Paste the real job description for the tightest match — or skip for a strong all-rounder.',
    ],
    example: 'With a target set, Aria shapes your bullets, skills & summary to fit that job.',
    source: 'How tailoring + ATS keyword-matching work',
  },
  heading: {
    icon: '📇',
    eyebrow: 'Your heading',
    thesis: 'The first thing scanned — keep it clean, professional, and ATS-safe.',
    points: [
      'Name (biggest), one phone, a <b>professional email</b> (first.last@ — not a nickname).',
      'City + country is enough — <b>skip your full street address.</b>',
      'Add your LinkedIn (90%+ of recruiters check it) + a portfolio/GitHub if you have one.',
      'Plain text — no photo or icon labels; they confuse the ATS.',
    ],
    example: 'Ada Obi · Lagos, NG · ada.obi@email.com · linkedin.com/in/adaobi · github.com/adaobi',
    source: 'How recruiters + ATS read your header',
  },
  history: {
    icon: '📈',
    eyebrow: 'Work history',
    thesis: 'Recruiters read this hardest — and reward achievements, not duties.',
    points: [
      'Lead with what you <b>achieved</b>, not what you were "responsible for."',
      'Shape each line: <b>did [action] → [result] → [a number]</b> (the XYZ formula).',
      'Quantify — %, time, money, scale. No number? Use scale ("across 40+ tickets a day").',
      '3–5 lines per role, strongest first, aimed at the job you want.',
    ],
    before: '"Responsible for customer support."',
    after: 'Cut response time ~30% by streamlining triage across 40+ daily tickets.',
    source: 'How recruiters & ATS actually read CVs',
  },
  projects: {
    icon: '🛠️',
    eyebrow: 'Projects',
    thesis:
      'A project says "I chose to build this" — so the why, your role & the tech matter most.',
    points: [
      'Say what it <b>does</b> and the problem it solves.',
      'Make <b>your part</b> clear — what you built vs. the team.',
      'Name the <b>tech & tools</b> — projects are where your skills show.',
      'Show the outcome (users, a grade, it shipped) + <b>add a link.</b>',
      'Course, personal, or work project? Each is framed a little differently.',
    ],
    example:
      'Built a ride-matching app in React & Node for my capstone — cut match time to <2s, demoed to 200+ students.',
    source: 'How strong project entries read',
  },
  education: {
    icon: '🎓',
    eyebrow: 'Education',
    thesis: 'As a student, this does heavy lifting — give it detail, near the top.',
    points: [
      'Always: <b>degree, school, location, graduation date.</b>',
      "Add your GPA if it's <b>3.5+ and recent</b>; leave it off otherwise.",
      'Little work experience? List <b>2–4 relevant courses</b> that match the job.',
      "Include honors / Dean's List — they show consistency.",
    ],
    example:
      "BSc Computer Science, University of Lagos — 2025 · GPA 3.7 · Dean's List · Relevant: Data Structures, Databases",
    source: 'How new-grad education sections are read',
  },
  skills: {
    icon: '🧰',
    eyebrow: 'Skills',
    thesis: "Skills get you past the robot — match the job's words exactly, don't pad.",
    points: [
      'About <b>70% hard skills</b> (tools, tech), 30% soft — roughly 8–15 hard + 3–5 soft.',
      'Use the job\'s <b>exact words</b>: it says "Salesforce" → don\'t write "CRM software" (ATS won\'t match).',
      "List only what you've <b>actually used</b> — no buzzword padding.",
      'Prove soft skills in your experience bullets, not as adjectives here.',
    ],
    example: 'Python · React · SQL · AWS · Figma — the tools the job actually named.',
    source: 'How ATS keyword-matching + recruiters read skills',
  },
  summary: {
    icon: '✍️',
    eyebrow: 'Summary',
    thesis: 'A tight 2–4 line pitch: who you are, your best skills, one real win.',
    points: [
      '<b>2–4 sentences (~50–60 words)</b> — a snapshot, not a story.',
      'Lead with your strongest relevant skills + a <b>quantified achievement.</b>',
      'Tailor it — mirror the target job\'s keywords. Third person, no "I".',
      'Little experience? Lead with education + transferable skills.',
    ],
    example:
      'Final-year CS student skilled in Python & React; built a ride-matching app used by 200+ students. Seeking a frontend internship.',
    source: 'How strong summaries are written',
  },
  finalize: {
    icon: '✅',
    eyebrow: 'Before you send',
    thesis: "A CV is ready when it's tailored, tight, and clean.",
    points: [
      'Every line tailored to <b>this</b> job — cut anything generic.',
      'Achievements quantified where you can; no "responsible for."',
      'One page if you can; consistent formatting; <b>proofread</b> twice.',
      'Save as PDF so it looks the same everywhere.',
    ],
    source: 'How finished CVs are judged',
  },
};
