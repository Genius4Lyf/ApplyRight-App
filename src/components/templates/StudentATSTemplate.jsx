import React from 'react';
import ReactMarkdown from 'react-markdown';

const StudentATSTemplate = ({ markdown, userProfile }) => {
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
        <div className="bg-white max-w-[800px] mx-auto p-8 font-[Arial,sans-serif] text-black leading-[1.6] text-[11pt]">
            {/* HEADER - Matches HTML template exactly */}
            <header className="text-center mb-6">
                <h1 className="text-[24pt] font-bold mb-3 tracking-tight uppercase">
                    {name}
                </h1>

                {contactInfo && (
                    <div className="text-[10pt] text-[#555555] flex justify-center flex-wrap gap-2">
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

                    // H2 = Section Headers (blue-grey, bold, 2px border) - EXACT match to HTML
                    h2: ({ node, ...props }) => (
                        <h2 className="text-[14pt] font-bold text-[#2C3E50] mb-3 pb-1 border-b-2 border-[#2C3E50] uppercase mt-6 first:mt-0" {...props} />
                    ),

                    // H3 = Job Titles / Entry Titles (bold, 12pt)
                    h3: ({ node, ...props }) => (
                        <h3 className="text-[12pt] font-bold mt-4 mb-2" {...props} />
                    ),

                    // H4 = Subtitles (company, institution - italic)
                    h4: ({ node, ...props }) => (
                        <h4 className="text-[11pt] italic mb-2" {...props} />
                    ),

                    // Paragraphs
                    p: ({ node, ...props }) => (
                        <p className="mb-3" {...props} />
                    ),

                    // Lists
                    ul: ({ node, ...props }) => (
                        <ul className="list-disc ml-5 mb-4" {...props} />
                    ),

                    li: ({ node, ...props }) => (
                        <li className="mb-1" {...props} />
                    ),

                    // Strong/Bold text
                    strong: ({ node, ...props }) => (
                        <strong className="font-bold" {...props} />
                    ),

                    // Links
                    a: ({ node, ...props }) => (
                        <a className="text-black no-underline" {...props} />
                    ),
                }}
            >
                {bodyMarkdown}
            </ReactMarkdown>
        </div>
    );
};

export default StudentATSTemplate;
