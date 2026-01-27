import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

// Link detection helper
const getIconForValue = (value) => {
    if (value.includes('@')) return <Mail size={12} />;
    if (value.match(/^\+?[\d\s\-\(\)]+$/) && value.length > 7) return <Phone size={12} />;
    if (value.toLowerCase().includes('linkedin')) return <Linkedin size={12} />;
    if (value.toLowerCase().includes('github')) return <Github size={12} />;
    return <Globe size={12} />;
};

const CreativePortfolioTemplate = ({ markdown, userProfile }) => {
    // Defensive checks
    if (!markdown || typeof markdown !== 'string') {
        return (
            <div className="p-8 text-center text-slate-400">
                <p>No CV content available</p>
                <p className="text-xs mt-2">Generate a CV from the dashboard to see it here.</p>
            </div>
        );
    }

    // Extract name from markdown (first H1) or use profile
    let name = 'YOUR NAME';
    try {
        const nameMatch = markdown.match(/^#\s+(.+)/m);
        const extractedName = nameMatch ? nameMatch[1] : null;
        const isGeneric = extractedName && (extractedName.includes('YOUR NAME') || extractedName.includes('[Full Name'));

        if (extractedName && !isGeneric) {
            name = extractedName;
        } else if (userProfile?.firstName) {
            const parts = [userProfile.firstName, userProfile.otherName, userProfile.lastName].filter(Boolean);
            name = parts.join(' ').toUpperCase();
        }
    } catch (error) {
        console.error('Error extracting name:', error);
    }

    // Get role title from profile
    const roleTitle = userProfile?.currentJobTitle || '';

    // Build contact info from profile
    const contactParts = [];
    try {
        if (userProfile?.email) contactParts.push(userProfile.email);
        if (userProfile?.phone) contactParts.push(userProfile.phone);
        if (userProfile?.portfolioUrl) {
            contactParts.push(userProfile.portfolioUrl.replace(/^https?:\/\//, ''));
        }
        if (userProfile?.linkedinUrl) {
            contactParts.push(userProfile.linkedinUrl.replace(/^https?:\/\/(www\.)?/, ''));
        }
    } catch (error) {
        console.error('Error building contact info:', error);
    }

    // Remove first H1 from markdown body as we'll render it in the header
    let bodyMarkdown = markdown;
    try {
        bodyMarkdown = markdown.replace(/^#\s+.+$/m, '');
    } catch (error) {
        console.error('Error processing markdown:', error);
    }

    return (
        <div className="bg-white max-w-[800px] mx-auto font-['Poppins',sans-serif] text-slate-800 leading-relaxed overflow-hidden">
            {/* INJECT FONTS */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');
            `}</style>

            {/* DECORATIVE TOP BAR */}
            <div className="h-4 bg-gradient-to-r from-purple-600 via-indigo-500 to-indigo-600"></div>

            {/* HEADER - Modern & Bold */}
            <header className="px-12 pt-10 pb-10 bg-slate-50 border-b border-indigo-100 mb-8">
                <div className="flex flex-col gap-6">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2 leading-tight">
                            {name}
                        </h1>
                        {roleTitle && (
                            <div className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider rounded-full mb-6">
                                {roleTitle}
                            </div>
                        )}

                        {contactParts.length > 0 && (
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 font-medium">
                                {contactParts.map((part, i) => (
                                    <div key={i} className="flex items-center gap-2 hover:text-indigo-600 transition-colors bg-white px-2 py-1 rounded border border-slate-100 shadow-sm">
                                        <span className="text-purple-500">{getIconForValue(part)}</span>
                                        <span>{part}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* BODY */}
            <div className="cv-body px-12 pb-12">
                <ReactMarkdown
                    components={{
                        // H1 = Handled in header
                        h1: () => null,

                        // H2 = Section Headers - Bold with colored underline accent
                        h2: ({ node, ...props }) => (
                            <h2 className="text-xl font-bold text-slate-900 mb-6 mt-10 flex items-center gap-3 after:content-[''] after:h-[2px] after:flex-1 after:bg-indigo-100" {...props}>
                                <span className="text-purple-600 mr-1">#</span>
                                {props.children}
                            </h2>
                        ),

                        // H3 = Job Titles - Strong layout
                        h3: ({ node, ...props }) => (
                            <h3 className="text-lg font-bold text-slate-900 mt-6 mb-2" {...props} />
                        ),

                        // H4 = Company/Date - Distinctive styling
                        h4: ({ node, ...props }) => (
                            <h4 className="text-sm font-semibold text-indigo-600 mb-3" {...props} />
                        ),

                        // Paragraphs
                        p: ({ node, ...props }) => (
                            <p className="text-sm leading-7 text-slate-600 mb-4" {...props} />
                        ),

                        // Lists - custom bullets
                        ul: ({ node, ...props }) => (
                            <ul className="list-none mb-6 space-y-2 text-sm leading-7 text-slate-600" {...props} />
                        ),

                        li: ({ node, ...props }) => (
                            <li className="relative pl-5 before:content-['•'] before:absolute before:left-0 before:text-purple-500 before:font-bold" {...props} />
                        ),

                        // Strong
                        strong: ({ node, ...props }) => (
                            <strong className="font-bold text-slate-900" {...props} />
                        ),

                        // Links
                        a: ({ node, ...props }) => (
                            <a className="text-indigo-600 font-semibold hover:text-purple-600 transition-colors" {...props} />
                        ),

                        // HR
                        hr: ({ node, ...props }) => (
                            <hr className="my-8 border-slate-100" {...props} />
                        ),
                    }}
                >
                    {bodyMarkdown}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default CreativePortfolioTemplate;
