import React from 'react';
import ReactMarkdown from 'react-markdown';

const ExecutiveLeadTemplate = ({ markdown, userProfile }) => {
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
        <div className="bg-white max-w-[800px] mx-auto font-sans text-slate-900 leading-relaxed shadow-sm">
            {/* INJECT FONTS */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700;900&family=Lato:wght@300;400;700&display=swap');
            `}</style>

            {/* LEFT BORDER ACCENT */}
            <div className="flex">
                {/* Header Section */}
                <div className="w-full">
                    <header className="px-10 py-12 bg-slate-900 text-white relative overflow-hidden">
                        {/* Subtle background detail */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800 rounded-bl-full opacity-50 -mr-16 -mt-16"></div>

                        <div className="relative z-10">
                            <h1 className="text-4xl font-serif font-black tracking-wide mb-2 uppercase text-white">
                                {name}
                            </h1>

                            {roleTitle && (
                                <div className="text-sm font-bold tracking-[0.15em] text-slate-300 uppercase mb-8 border-b border-slate-700 pb-4 inline-block pr-12">
                                    {roleTitle}
                                </div>
                            )}

                            {contactParts.length > 0 && (
                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-light text-slate-300">
                                    {contactParts.map((part, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className="w-1 h-1 bg-slate-500 rounded-full"></span>
                                            {part}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </header>

                    {/* BODY */}
                    <div className="p-10 cv-body font-['Lato',sans-serif]">
                        <ReactMarkdown
                            components={{
                                // H1 = Handled in header
                                h1: () => null,

                                // H2 = Section Headers - Classic layout
                                h2: ({ node, ...props }) => (
                                    <h2 className="text-md font-serif font-bold text-slate-900 uppercase tracking-widest mb-6 mt-10 border-b-2 border-slate-800 pb-2" {...props} />
                                ),

                                // H3 = Job Titles
                                h3: ({ node, ...props }) => (
                                    <h3 className="text-lg font-bold text-slate-900 mt-6 mb-1" {...props} />
                                ),

                                // H4 = Company/Date
                                h4: ({ node, ...props }) => (
                                    <h4 className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wide" {...props} />
                                ),

                                // Paragraphs
                                p: ({ node, ...props }) => (
                                    <p className="text-sm leading-7 text-slate-700 mb-4 text-justify" {...props} />
                                ),

                                // Lists
                                ul: ({ node, ...props }) => (
                                    <ul className="list-square mb-6 space-y-2 text-sm leading-7 text-slate-700 ml-5" {...props} />
                                ),

                                li: ({ node, ...props }) => (
                                    <li className="pl-1 marker:text-slate-800" {...props} />
                                ),

                                // Strong
                                strong: ({ node, ...props }) => (
                                    <strong className="font-bold text-slate-900" {...props} />
                                ),

                                // Links
                                a: ({ node, ...props }) => (
                                    <a className="text-slate-900 underline decoration-slate-400 decoration-1 underline-offset-2" {...props} />
                                ),

                                // HR
                                hr: ({ node, ...props }) => (
                                    <hr className="my-8 border-slate-200" {...props} />
                                ),
                            }}
                        >
                            {bodyMarkdown}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExecutiveLeadTemplate;
