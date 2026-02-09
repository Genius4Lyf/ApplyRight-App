export const TEMPLATES = [
    {
        id: 'ats-clean',
        name: 'ATS Clean',
        isPro: false,
        cost: 0,
        isRecommended: true, // Recommended
        description: 'Minimal, single-column design optimized for ATS parsing.',
        thumbnail: 'bg-white border-2 border-slate-200'
    },
    {
        id: 'student-ats',
        name: 'Student ATS',
        isPro: true, // Locked
        cost: 25,
        isRecommended: true, // Recommended
        description: 'Academic-focused layout with education first, perfect for students.',
        thumbnail: 'bg-slate-50 border-2 border-[#2C3E50]'
    },
    {
        id: 'modern-professional',
        name: 'Modern Professional',
        isPro: true,
        cost: 20,
        isRecommended: true, // Recommended
        description: 'Strict ATS-optimized layout. Single column, clean, and factual.',
        thumbnail: 'bg-stone-100 border-l-4 border-stone-400'
    },
    {
        id: 'modern',
        name: 'Modern Clean',
        isPro: true,
        cost: 20,
        description: 'Clean and professional, perfect for corporate roles.',
        thumbnail: 'bg-indigo-50 border-indigo-200'
        // In a real app, thumbnail would be an image URL. Using CSS classes for colorful placeholders.
    },
    {
        id: 'minimal',
        name: 'Minimalist Standard',
        isPro: true,
        cost: 20,
        description: 'Distraction-free design that focuses purely on content.',
        thumbnail: 'bg-stone-50 border-stone-200'
    },
    {
        id: 'minimal-serif',
        name: 'The Author',
        isPro: true,
        cost: 20,
        description: 'Elegant, book-like styling with serif typography.',
        thumbnail: 'bg-stone-50 border-stone-200'
    },
    {
        id: 'minimal-grid',
        name: 'Nordic Grid',
        isPro: true,
        cost: 20,
        description: 'Structured 2-column layout with clean, swiss alignment.',
        thumbnail: 'bg-stone-50 border-stone-200'
    },
    {
        id: 'minimal-mono',
        name: 'Typewriter',
        isPro: true,
        cost: 20,
        description: 'Raw, monospaced aesthetic for a technical feel.',
        thumbnail: 'bg-stone-50 border-stone-200'
    },
    {
        id: 'creative',
        name: 'ApplyRight Brilliance',
        isPro: true,
        cost: 25,
        description: 'Bold headers and colorful accents for design and marketing.',
        thumbnail: 'bg-purple-50 border-purple-200'
    },
    {
        id: 'executive',
        name: 'Executive Lead',
        isPro: true,
        cost: 30,
        description: 'Sophisticated layout emphasizing experience and leadership.',
        thumbnail: 'bg-slate-800 border-slate-600'
    },
    {
        id: 'swiss',
        name: 'ApplyRight Swiss',
        isPro: true,
        cost: 25,
        description: 'Bold, grid-based design with ApplyRight gradient branding.',
        thumbnail: 'bg-red-50 border-indigo-600' // Placeholder
    },
    {
        id: 'luxury',
        name: 'Elegant Luxury',
        isPro: true,
        cost: 40,
        description: 'High-end, prestigious design with serif fonts and gold accents.',
        thumbnail: 'bg-amber-50 border-amber-300'
    },
    {
        id: 'luxury-royal',
        name: 'Royal Elegance',
        isPro: true,
        cost: 40,
        description: 'Heavy serif headers, centered layout, deep gold palette. Traditional luxury.',
        thumbnail: 'bg-slate-900 border-amber-400'
    },
    {
        id: 'luxury-chic',
        name: 'Modern Chic',
        isPro: true,
        cost: 35,
        description: 'High contrast, fashion-editorial vibe. Lots of whitespace.',
        thumbnail: 'bg-white border-black'
    },
    {
        id: 'luxury-classic',
        name: 'Classic Slate',
        isPro: true,
        cost: 30,
        description: 'Muted tones, very traditional, understated wealth.',
        thumbnail: 'bg-slate-100 border-slate-300'
    },
    {
        id: 'luxury-gold',
        name: 'Gilded Minimalist',
        isPro: true,
        cost: 35,
        description: 'Clean minimalist layout with a single, meaningful gold foil accent.',
        thumbnail: 'bg-white border-b-4 border-amber-400'
    },
    {
        id: 'executive-board',
        name: 'Boardroom Director',
        isPro: true,
        cost: 35,
        description: 'Dense, structured layout with authoritarian dark blue headers.',
        thumbnail: 'bg-blue-900 border-blue-700'
    },
    {
        id: 'executive-strategy',
        name: 'Strategic Vision',
        isPro: true,
        cost: 30,
        description: 'Modern corporate look with distinct sidebar for competencies.',
        thumbnail: 'bg-slate-50 border-l-8 border-slate-600'
    },
    {
        id: 'executive-corporate',
        name: 'Corporate Clean',
        isPro: true,
        cost: 25,
        description: 'Authoritative, gray-scale design. Zero fluff, pure business.',
        thumbnail: 'bg-gray-100 border-gray-400'
    },
    {
        id: 'tech',
        name: 'Tech Stack',
        isPro: true,
        cost: 25,
        description: 'Optimized to highlight technical skills and project portfolios.',
        thumbnail: 'bg-blue-900 border-blue-500'
    },
    {
        id: 'tech-devops',
        name: 'DevOps Terminal',
        isPro: true,
        cost: 25,
        description: 'Dark-themed header with monospaced terminal fonts.',
        thumbnail: 'bg-slate-900 border-green-500'
    },
    {
        id: 'tech-silicon',
        name: 'Silicon Valley',
        isPro: true,
        cost: 25,
        description: 'Modern startup vibe with subtle gradients and clean sans-serif.',
        thumbnail: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-indigo-200'
    },
    {
        id: 'tech-google',
        name: 'Tech Titan',
        isPro: true,
        cost: 30,
        description: 'Clean, colorful design inspired by modern tech giants.',
        thumbnail: 'bg-white border-t-4 border-blue-500'
    },
    {
        id: 'executive-energy',
        name: 'Energy Professional',
        isPro: true,
        cost: 30,
        description: 'Industrial strength design for Oil, Gas & Energy sectors.',
        thumbnail: 'bg-white border-red-700'
    },
    {
        id: 'energy-slb',
        name: 'Schlumberger Style',
        isPro: true,
        cost: 30,
        description: 'Technical excellence inspired by SLB branding.',
        thumbnail: 'bg-[#0114DC]'
    },
    {
        id: 'energy-total',
        name: 'Total Energy',
        isPro: true,
        cost: 30,
        description: 'Dynamic gradient design inspired by TotalEnergies.',
        thumbnail: 'bg-white border-t-4 border-[#D52B1E]'
    },
    {
        id: 'energy-seplat',
        name: 'Seplat Green',
        isPro: true,
        cost: 30,
        description: 'Sustainable growth design inspired by Seplat.',
        thumbnail: 'bg-white border-green-600'
    },
    {
        id: 'energy-halliburton',
        name: 'Halliburton Red',
        isPro: true,
        cost: 30,
        description: 'Bold industrial design inspired by Halliburton.',
        thumbnail: 'bg-black border-red-600'
    },
    {
        id: 'energy-nlng',
        name: 'NLNG Professional',
        isPro: true,
        cost: 30,
        description: 'Clean corporate design inspired by NLNG.',
        thumbnail: 'bg-white border-green-700'
    }
];
