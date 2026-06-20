export const compactNumber = (value) =>
  new Intl.NumberFormat('en-NG', {
    maximumFractionDigits: 1,
    notation: 'compact',
  }).format(Number(value) || 0);

export const AD_TEMPLATES = [
  {
    id: 'social-proof',
    name: 'Trust Pulse',
    description: 'High-contrast awareness creative centered on adoption and proof.',
    bgColor: '#020617',
    focus: 'Awareness',
    accentColor: '#67e8f9',
    bullets: [
      'Leads with total user growth and product adoption.',
      'Highlights resume, analysis, and download volume.',
      'Best for broad social proof or milestone campaigns.',
    ],
  },
  {
    id: 'growth-story',
    name: 'Growth Story',
    description: 'Editorial light layout built for milestone posts and operator snapshots.',
    bgColor: '#f8fafc',
    focus: 'Milestone',
    accentColor: '#4f46e5',
    bullets: [
      'Pairs a single hero metric with supporting trend bars.',
      'Works well for monthly recaps and public progress updates.',
      'Keeps the tone clean, premium, and less campaign-heavy.',
    ],
  },
  {
    id: 'impact-report',
    name: 'Impact Report',
    description: 'Split-layout funnel visual for operational growth and adoption storytelling.',
    bgColor: '#020617',
    focus: 'Adoption',
    accentColor: '#818cf8',
    bullets: [
      'Shows the sign-up to application journey in one export.',
      'Best for data-driven posts and investor-style updates.',
      'Surfaces resume, analysis, and download adoption.',
    ],
  },
];
