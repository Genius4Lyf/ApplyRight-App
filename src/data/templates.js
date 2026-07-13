export const TEMPLATES = [
  {
    id: 'ats-clean',
    name: 'ATS Clean',
    group: 'Simple',
    isPro: false,
    cost: 0,
    isRecommended: true, // Recommended
    description: 'Minimal, single-column design optimized for ATS parsing.',
    thumbnail: 'bg-white border-2 border-slate-200',
  },
  {
    id: 'student-ats',
    name: 'Student ATS',
    group: 'Simple',
    isPro: true, // Locked
    cost: 30,
    isRecommended: true, // Recommended
    description: 'Academic-focused layout with education first, perfect for students.',
    thumbnail: 'bg-slate-50 border-2 border-[#2C3E50]',
  },
  {
    id: 'modern-professional',
    name: 'Modern Professional',
    group: 'Professional',
    isPro: true,
    cost: 30,
    isRecommended: true, // Recommended
    description: 'Strict ATS-optimized layout. Single column, clean, and factual.',
    thumbnail: 'bg-stone-100 border-l-4 border-stone-400',
  },
  {
    id: 'modern',
    name: 'Modern Clean',
    group: 'Professional',
    isPro: true,
    cost: 30,
    description: 'Clean and professional, perfect for corporate roles.',
    thumbnail: 'bg-indigo-50 border-indigo-200',
    // In a real app, thumbnail would be an image URL. Using CSS classes for colorful placeholders.
  },
  {
    id: 'executive-corporate',
    name: 'Corporate Clean',
    group: 'Professional',
    isPro: true,
    cost: 30,
    description: 'Authoritative, gray-scale design. Zero fluff, pure business.',
    thumbnail: 'bg-gray-100 border-gray-400',
  },
  {
    id: 'minimal-serif',
    name: 'The Author',
    group: 'Editorial',
    isPro: true,
    cost: 30,
    description: 'Elegant, book-like styling with serif typography.',
    thumbnail: 'bg-stone-50 border-stone-200',
  },
  {
    id: 'minimal-grid',
    name: 'Nordic Grid',
    group: 'Editorial',
    isPro: true,
    cost: 30,
    description: 'Structured 2-column layout with clean, swiss alignment.',
    thumbnail: 'bg-stone-50 border-stone-200',
  },
  {
    id: 'executive-energy',
    name: 'Energy / Industrial',
    group: 'Industry',
    isPro: true,
    cost: 30,
    description: 'Industrial strength design for Oil, Gas & Energy sectors.',
    thumbnail: 'bg-white border-red-700',
  },
];
