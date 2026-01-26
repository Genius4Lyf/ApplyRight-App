import React from 'react';
import ReactMarkdown from 'react-markdown';

const TechStackTemplate = ({ markdown, userProfile }) => {
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
        <div className="bg-white max-w-[800px] mx-auto font-['Roboto',sans-serif] text-slate-800 leading-relaxed shadow-sm border-t-8 border-blue-600">
            {/* INJECT FONTS */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=JetBrains+Mono:wght@400;700&display=swap');
            `}</style>

            {/* HEADER */}
            <header className="px-12 py-10 bg-slate-50 border-b border-slate-200">
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2 uppercase">
                            {name}
                        </h1>

                        {roleTitle && (
                            <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-xs font-mono font-bold rounded border border-blue-200 mb-4">
                                {`> ${roleTitle}`}
                            </div>
                        )}
                    </div>
                </div>

                {contactParts.length > 0 && (
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-sm text-slate-600 font-mono">
                        {contactParts.map((part, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="text-blue-500">./</span>
                                {part}
                            </div>
                        ))}
                    </div>
                )}
            </header>

            {/* BODY */}
            <div className="cv-body p-12">
                <ReactMarkdown
                    components={{
                        // H1 = Handled in header
                        h1: () => null,

                        // H2 = Section Headers - Technical styling
                        h2: ({ node, ...props }) => (
                            <h2 className="text-lg font-bold text-slate-900 mb-4 mt-8 pb-1 border-b-2 border-slate-200 flex items-center font-mono uppercase tracking-wide" {...props}>
                                <span className="text-blue-600 mr-2 text-xl font-sans">|</span>
                                {props.children}
                            </h2>
                        ),

                        // H3 = Job Titles
                        h3: ({ node, ...props }) => (
                            <h3 className="text-md font-bold text-slate-900 mt-6 mb-1" {...props} />
                        ),

                        // H4 = Company/Date
                        h4: ({ node, ...props }) => (
                            <h4 className="text-sm font-medium text-blue-600 mb-3 font-mono" {...props} />
                        ),

                        // Paragraphs
                        p: ({ node, ...props }) => (
                            <p className="text-sm leading-6 text-slate-600 mb-3" {...props} />
                        ),

                        // Lists - styled like code/tech bullets
                        ul: ({ node, ...props }) => (
                            <ul className="list-none mb-4 space-y-1 text-sm leading-6 text-slate-600" {...props} />
                        ),

                        li: ({ node, ...props }) => (
                            <li className="relative pl-5 before:content-['>'] before:absolute before:left-0 before:text-blue-500 before:font-mono before:font-bold before:text-xs before:top-[4px]" {...props} />
                        ),

                        // Strong
                        strong: ({ node, ...props }) => (
                            <strong className="font-semibold text-slate-800" {...props} />
                        ),

                        // Code blocks within text (for technical terms)
                        code: ({ node, ...props }) => (
                            <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-xs font-mono border border-slate-200" {...props} />
                        ),

                        // Links
                        a: ({ node, ...props }) => (
                            <a className="text-blue-600 hover:underline decoration-blue-300" {...props} />
                        ),

                        // HR
                        hr: ({ node, ...props }) => (
                            <hr className="my-8 border-slate-100 dashed" {...props} />
                        ),
                    }}
                >
                    {bodyMarkdown}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default TechStackTemplate;
