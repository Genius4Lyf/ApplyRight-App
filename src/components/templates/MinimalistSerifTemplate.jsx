import React from 'react';
import ReactMarkdown from 'react-markdown';

const MinimalistSerifTemplate = ({ markdown, userProfile }) => {
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

    // Remove first H1 from markdown body
    let bodyMarkdown = markdown;
    try {
        bodyMarkdown = markdown.replace(/^#\s+.+$/m, '');
    } catch (error) {
        console.error('Error processing markdown:', error);
    }

    return (
        <div className="bg-white max-w-[800px] mx-auto p-12 font-['Merriweather',serif] text-slate-800 leading-relaxed text-[11pt]">
            {/* INJECT FONTS */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&display=swap');
            `}</style>

            {/* HEADER - Classic Book Style */}
            <header className="text-center mb-14 border-b-2 border-slate-100 pb-10">
                <h1 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">
                    {name}
                </h1>

                {roleTitle && (
                    <div className="text-sm italic text-slate-600 mb-6 font-light">
                        {roleTitle}
                    </div>
                )}

                {contactParts.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-400 uppercase tracking-widest font-sans">
                        {contactParts.map((part, i) => (
                            <span key={i}>{part}</span>
                        ))}
                    </div>
                )}
            </header>

            {/* BODY */}
            <div className="cv-body space-y-6">
                <ReactMarkdown
                    components={{
                        // H1 handled in header
                        h1: () => null,

                        // H2 = Section Headers - Big serif, elegant
                        h2: ({ node, ...props }) => (
                            <h2 className="text-xl font-bold text-slate-900 mt-10 mb-6 pb-2 border-b border-slate-100" {...props} />
                        ),

                        // H3 = Job Titles - Serif bold
                        h3: ({ node, ...props }) => (
                            <h3 className="text-lg font-bold text-slate-800 mt-6 mb-1" {...props} />
                        ),

                        // H4 = Company/Date - Sans-serif for contrast
                        h4: ({ node, ...props }) => (
                            <h4 className="text-xs font-sans font-semibold uppercase tracking-wider text-slate-500 mb-3" {...props} />
                        ),

                        // Paragraphs - Book-like leading
                        p: ({ node, ...props }) => (
                            <p className="text-[11pt] font-light leading-8 text-slate-700 mb-4 text-justify" {...props} />
                        ),

                        // Lists
                        ul: ({ node, ...props }) => (
                            <ul className="list-disc pl-5 mb-6 space-y-2 text-[11pt] leading-8 text-slate-700" {...props} />
                        ),

                        li: ({ node, ...props }) => (
                            <li className="pl-1" {...props} />
                        ),

                        strong: ({ node, ...props }) => (
                            <strong className="font-bold text-slate-900" {...props} />
                        ),

                        a: ({ node, ...props }) => (
                            <a className="text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900 transition-all font-medium" {...props} />
                        ),
                    }}
                >
                    {bodyMarkdown}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default MinimalistSerifTemplate;
