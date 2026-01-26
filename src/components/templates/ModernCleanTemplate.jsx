import React from 'react';
import ReactMarkdown from 'react-markdown';

const ModernCleanTemplate = ({ markdown, userProfile }) => {
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
    const contactInfo = contactParts.join(' | ');

    // Remove first H1 from markdown body as we'll render it in the header
    let bodyMarkdown = markdown;
    try {
        bodyMarkdown = markdown.replace(/^#\s+.+$/m, '');
    } catch (error) {
        console.error('Error processing markdown:', error);
    }

    return (
        <div className="bg-white max-w-[800px] mx-auto font-['Inter',sans-serif] text-slate-900 leading-relaxed">
            {/* INJECT FONTS */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            `}</style>

            {/* HEADER */}
            <header className="mb-8 pb-6">
                <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight leading-none">
                    {name}
                </h1>

                {roleTitle && (
                    <div className="text-lg font-medium text-indigo-600 mb-3 uppercase tracking-wide">
                        {roleTitle}
                    </div>
                )}

                {contactInfo && (
                    <div className="text-sm text-slate-600 flex flex-wrap gap-2">
                        {contactParts.map((part, i) => (
                            <React.Fragment key={i}>
                                <span className="whitespace-nowrap">{part}</span>
                                {i < contactParts.length - 1 && <span className="text-slate-300">|</span>}
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </header>

            {/* BODY */}
            <div className="cv-body">
                <ReactMarkdown
                    components={{
                        // H1 = Handled in header
                        h1: () => null,

                        // H2 = Section Headers
                        h2: ({ node, ...props }) => (
                            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 mt-8 pb-2 border-b border-slate-200" {...props} />
                        ),

                        // H3 = Job Titles / Project Names
                        h3: ({ node, ...props }) => (
                            <h3 className="text-lg font-bold text-slate-900 mt-6 mb-1" {...props} />
                        ),

                        // H4 = Company / Degrees
                        h4: ({ node, ...props }) => (
                            <h4 className="text-md font-semibold text-slate-700 mt-4 mb-1" {...props} />
                        ),

                        // Paragraphs
                        p: ({ node, ...props }) => (
                            <p className="text-sm text-slate-600 leading-relaxed mb-3" {...props} />
                        ),

                        // Lists
                        ul: ({ node, ...props }) => (
                            <ul className="list-disc pl-4 mb-4 space-y-1 text-sm text-slate-600" {...props} />
                        ),

                        li: ({ node, ...props }) => (
                            <li className="pl-1 leading-normal" {...props} />
                        ),

                        // Strong
                        strong: ({ node, ...props }) => (
                            <strong className="font-semibold text-slate-900" {...props} />
                        ),

                        // Links
                        a: ({ node, ...props }) => (
                            <a className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2" {...props} />
                        ),

                        // Horizontal rule
                        hr: ({ node, ...props }) => (
                            <hr className="my-6 border-slate-100" {...props} />
                        ),
                    }}
                >
                    {bodyMarkdown}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default ModernCleanTemplate;
