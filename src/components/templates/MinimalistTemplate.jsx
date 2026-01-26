import React from 'react';
import ReactMarkdown from 'react-markdown';

const MinimalistTemplate = ({ markdown, userProfile }) => {
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
        <div className="bg-white max-w-[800px] mx-auto p-12 font-['Open_Sans',sans-serif] text-slate-800 leading-relaxed">
            {/* INJECT FONTS */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600&display=swap');
            `}</style>

            {/* HEADER - Minimalist Center */}
            <header className="text-center mb-12">
                <h1 className="text-3xl font-light tracking-[0.2em] text-slate-900 mb-4 uppercase">
                    {name}
                </h1>

                {roleTitle && (
                    <div className="text-sm font-semibold tracking-[0.15em] text-slate-500 uppercase mb-6">
                        {roleTitle}
                    </div>
                )}

                {contactParts.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-light text-slate-500 tracking-wide">
                        {contactParts.map((part, i) => (
                            <span key={i}>{part}</span>
                        ))}
                    </div>
                )}
            </header>

            {/* BODY */}
            <div className="cv-body space-y-4">
                <ReactMarkdown
                    components={{
                        // H1 = Handled in header
                        h1: () => null,

                        // H2 = Section Headers - Minimal, no borders, just spacing and caps
                        h2: ({ node, ...props }) => (
                            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-[0.2em] mt-10 mb-6" {...props} />
                        ),

                        // H3 = Job Titles - Light weight but larger
                        h3: ({ node, ...props }) => (
                            <h3 className="text-base font-semibold text-slate-800 mt-6 mb-1" {...props} />
                        ),

                        // H4 = Company/Date - Small, lighter gray
                        h4: ({ node, ...props }) => (
                            <h4 className="text-sm font-light text-slate-500 mb-3 italic" {...props} />
                        ),

                        // Paragraphs - Good leading for readability
                        p: ({ node, ...props }) => (
                            <p className="text-sm font-light leading-7 text-slate-600 mb-4" {...props} />
                        ),

                        // Lists - Clean bullets
                        ul: ({ node, ...props }) => (
                            <ul className="list-disc pl-5 mb-6 space-y-2 text-sm font-light leading-7 text-slate-600" {...props} />
                        ),

                        li: ({ node, ...props }) => (
                            <li className="pl-1" {...props} />
                        ),

                        // Strong - Subtle contrast
                        strong: ({ node, ...props }) => (
                            <strong className="font-semibold text-slate-800" {...props} />
                        ),

                        // Links
                        a: ({ node, ...props }) => (
                            <a className="text-slate-800 border-b border-slate-300 hover:border-slate-800 pb-[1px] transition-colors" {...props} />
                        ),

                        // HR - Hidden or very subtle
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

export default MinimalistTemplate;
