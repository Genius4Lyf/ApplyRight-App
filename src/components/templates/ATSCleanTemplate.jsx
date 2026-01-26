import React from 'react';
import ReactMarkdown from 'react-markdown';

const ATSCleanTemplate = ({ markdown, userProfile }) => {
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
        name = nameMatch ? nameMatch[1] : (
            userProfile?.firstName && userProfile?.lastName
                ? `${userProfile.firstName} ${userProfile.lastName}`.toUpperCase()
                : 'YOUR NAME'
        );
    } catch (error) {
        console.error('Error extracting name:', error);
    }

    // Get role title from profile (safely)
    const roleTitle = userProfile?.currentJobTitle || '';

    // Build contact info line from profile (safely)
    const contactParts = [];
    try {
        if (userProfile?.email) contactParts.push(userProfile.email);
        if (userProfile?.phone) contactParts.push(userProfile.phone);
        if (userProfile?.portfolioUrl) contactParts.push(userProfile.portfolioUrl.replace(/^https?:\/\//, ''));
        if (userProfile?.linkedinUrl) contactParts.push(userProfile.linkedinUrl.replace(/^https?:\/\/(www\.)?/, ''));
    } catch (error) {
        console.error('Error building contact info:', error);
    }
    const contactInfo = contactParts.join(' | ');

    // Remove first H1 from markdown body
    let bodyMarkdown = markdown;
    try {
        bodyMarkdown = markdown.replace(/^#\s+.+$/m, '');
    } catch (error) {
        console.error('Error processing markdown:', error);
    }

    return (
        <div className="bg-white max-w-[800px] mx-auto p-8 font-['Inter',system-ui,sans-serif] text-[#1a1a1a] leading-[1.5] text-[11pt]">
            {/* INJECT FONTS */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            `}</style>

            {/* HEADER - Matches HTML template exactly */}
            <header className="text-center mb-8">
                <h1 className="text-[24pt] font-bold mb-2 uppercase tracking-[-0.02em] text-[#1a1a1a]">
                    {name}
                </h1>

                {roleTitle && (
                    <div className="text-[11pt] text-[#666666] mb-2 font-medium uppercase tracking-[0.05em]">
                        {roleTitle}
                    </div>
                )}

                {contactInfo && (
                    <div className="text-[10pt] text-[#666666] flex justify-center flex-wrap gap-2">
                        {contactParts.map((part, i) => (
                            <React.Fragment key={i}>
                                <span className="whitespace-nowrap">{part}</span>
                                {i < contactParts.length - 1 && <span className="text-[#cccccc]">|</span>}
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </header>

            {/* BODY - Render markdown with exact HTML template styling */}
            <ReactMarkdown
                components={{
                    // H1 = Already handled in header, skip in body
                    h1: () => null,

                    // H2 = Section Headers (uppercase, grey border) - EXACT match to HTML
                    h2: ({ node, ...props }) => (
                        <h2 className="text-[12pt] font-bold uppercase tracking-[0.05em] text-[#1a1a1a] border-b border-[#e5e5e5] pb-2 mb-4 mt-6 first:mt-0" {...props} />
                    ),

                    // H3 = Job Titles / Entry Titles (bold, 11pt)
                    h3: ({ node, ...props }) => (
                        <h3 className="text-[11pt] font-bold mt-4 mb-1" {...props} />
                    ),

                    // H4 = Subtitles (company, institution - medium weight)
                    h4: ({ node, ...props }) => (
                        <h4 className="text-[11pt] font-medium mb-2" {...props} />
                    ),

                    // Paragraphs (11pt, grey)
                    p: ({ node, ...props }) => (
                        <p className="mb-2 text-[11pt]" {...props} />
                    ),

                    // Lists - disc bullets, proper spacing
                    ul: ({ node, ...props }) => (
                        <ul className="list-disc ml-5 mb-2" {...props} />
                    ),

                    li: ({ node, ...props }) => (
                        <li className="mb-1" {...props} />
                    ),

                    // Strong/Bold text
                    strong: ({ node, ...props }) => (
                        <strong className="font-bold" {...props} />
                    ),

                    // Links (grey, no underline for print)
                    a: ({ node, ...props }) => (
                        <a className="text-[#666666] no-underline" {...props} />
                    ),
                }}
            >
                {bodyMarkdown}
            </ReactMarkdown>
        </div>
    );
};

export default ATSCleanTemplate;
