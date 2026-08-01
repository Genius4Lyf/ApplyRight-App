// Curated manually each week. StudioBestChoices preserves this order, so changing
// the five ids here updates the Best Choices shelf in CV Studio.
export const WEEKLY_TRENDING_TEMPLATE_IDS = [
  'applyright-band-twin',
  'the-ascent',
  'minimal-serif',
  'executive-energy',
  'navy-portrait',
];

export const TEMPLATES = [
  {
    id: 'applyright-navy',
    name: 'ApplyRight Navy',
    group: 'ApplyRight',
    isPro: true,
    cost: 30,
    description:
      'ApplyRight’s flagship navy layout with an orbital portrait, confident typography, and a focused sidebar.',
    thumbnail: 'bg-[#0c1627] border-2 border-slate-300',
  },
  {
    id: 'applyright-band',
    name: 'ApplyRight Band',
    group: 'ApplyRight',
    isPro: true,
    cost: 30,
    description:
      'A premium ink-band header with ApplyRight’s orbital mark and a clean skills column.',
    thumbnail: 'bg-white border-2 border-[#090d18] border-t-4 border-t-[#090d18]',
  },
  {
    id: 'applyright-band-twin',
    name: 'ApplyRight Band Twin',
    group: 'ApplyRight',
    isPro: true,
    cost: 30,
    description:
      'The warm-paper twin of ApplyRight Band, pairing a soft stone masthead with precise black editorial structure.',
    thumbnail: 'bg-[#f5f5f2] border-2 border-[#111318] border-t-4 border-t-[#111318]',
  },
  {
    id: 'applyright-mono',
    name: 'ApplyRight Mono',
    group: 'ApplyRight',
    isPro: true,
    cost: 30,
    description:
      'A restrained black-and-white ApplyRight layout for conservative and highly formal applications.',
    thumbnail: 'bg-[#f5f5f2] border-2 border-[#111318]',
  },
  {
    id: 'ats-clean',
    name: 'ATS Clean',
    group: 'Simple',
    isPro: false,
    cost: 0,
    description:
      'A recruiter-standard, monochrome single-column layout built for maximum ATS clarity.',
    thumbnail: 'bg-white border-2 border-slate-200',
  },
  {
    id: 'student-ats',
    name: 'Student ATS',
    group: 'Simple',
    isPro: false,
    cost: 0,
    description:
      'A polished early-career layout with restrained navy details and clear academic hierarchy.',
    thumbnail: 'bg-slate-50 border-2 border-[#2C3E50]',
  },
  {
    id: 'modern-professional',
    name: 'Modern Professional',
    group: 'Professional',
    isPro: true,
    cost: 30,
    description:
      'A polished consulting-style layout with warm neutrals and precise editorial rhythm.',
    thumbnail: 'bg-[#f7f6f2] border-l-4 border-[#9a6b3f]',
  },
  {
    id: 'slate-timeline',
    name: 'Slate Timeline',
    group: 'Sidebar',
    isPro: true,
    cost: 30,
    description:
      'Dark profile rail with a structured career timeline and generous editorial spacing.',
    thumbnail: 'bg-white border-l-4 border-l-[#343d4d]',
  },
  {
    id: 'navy-portrait',
    name: 'Navy Portrait',
    group: 'Sidebar',
    isPro: true,
    cost: 30,
    description:
      'Confident navy sidebar with a bold nameplate for client-facing and commercial roles.',
    thumbnail: 'bg-white border-l-4 border-l-[#193e57]',
  },
  {
    id: 'angular-corporate',
    name: 'Angular Corporate',
    group: 'Professional',
    isPro: true,
    cost: 30,
    description:
      'Full-width geometric header and a crisp single-column body for corporate applications.',
    thumbnail: 'bg-white border-t-4 border-t-[#314a60]',
  },
  {
    id: 'sales-sidebar',
    name: 'Sales Sidebar',
    group: 'Sidebar',
    isPro: true,
    cost: 30,
    description:
      'Soft blue profile banner and rounded sidebar designed for sales and service careers.',
    thumbnail: 'bg-white border-l-4 border-l-[#d5dfe7]',
  },
  {
    id: 'modern',
    name: 'Modern Clean',
    group: 'Professional',
    isPro: true,
    cost: 30,
    description:
      'Crisp teal accents, a compact contact grid, and a contemporary corporate hierarchy.',
    thumbnail: 'bg-white border-teal-700',
    // In a real app, thumbnail would be an image URL. Using CSS classes for colorful placeholders.
  },
  {
    id: 'executive-corporate',
    name: 'Corporate Clean',
    group: 'Professional',
    isPro: true,
    cost: 30,
    description:
      'A restrained boardroom layout with a strong masthead and disciplined section rules.',
    thumbnail: 'bg-gray-100 border-gray-400',
  },
  {
    id: 'the-ascent',
    name: 'The Ascent',
    group: 'Professional',
    isPro: true,
    cost: 30,
    description:
      'An achievement-led editorial design with copper milestones that signal steady progression.',
    thumbnail: 'bg-white border-l-4 border-[#9b5d30]',
  },
  {
    id: 'minimal-serif',
    name: 'The Author',
    group: 'Editorial',
    isPro: true,
    cost: 30,
    description:
      'A refined editorial résumé with an ink-and-paper palette and literary display type.',
    thumbnail: 'bg-[#fcfbf7] border-[#7b3f35]',
  },
  {
    id: 'minimal-grid',
    name: 'Nordic Grid',
    group: 'Sidebar',
    isPro: true,
    cost: 30,
    description: 'Structured 2-column layout with clean, swiss alignment.',
    thumbnail: 'bg-stone-50 border-stone-200',
  },
  {
    id: 'the-profile',
    name: 'The Profile',
    group: 'Editorial',
    isPro: true,
    cost: 30,
    description:
      'A magazine masthead treatment for brand, comms and creative leadership — serif byline, credits-line contact, summary set as a pulled quote.',
    thumbnail: 'bg-[#faf8f4] border-2 border-[#6d3955]',
  },
  {
    id: 'executive-energy',
    name: 'Energy / Industrial',
    group: 'Industry',
    isPro: true,
    cost: 30,
    description:
      'A precise technical-report layout for engineering, operations, HSE, energy, manufacturing, construction, and logistics roles.',
    thumbnail: 'bg-white border-[#d68a00]',
  },
  {
    id: 'operations-blueprint',
    name: 'Operations Blueprint',
    group: 'Industry',
    isPro: true,
    cost: 30,
    description:
      'A technical operations layout with a graphite control-panel masthead, safety-orange register marks, and precise delivery-focused hierarchy.',
    thumbnail: 'bg-[#fbfaf7] border-t-4 border-t-[#18232d] border-l-2 border-l-[#ef8f22]',
  },
];
