import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

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
                ? [userProfile.firstName, userProfile.otherName, userProfile.lastName].filter(Boolean).join(' ').toUpperCase()
                : 'YOUR NAME'
        );
    } catch (error) {
        console.error('Error extracting name:', error);
    }

    // Get role title from profile (safely)
    const roleTitle = userProfile?.currentJobTitle || '';

    // Build contact info line from profile (safely)
    // Build contact info from profile
    const contactItems = [];
    try {
        if (userProfile?.email) contactItems.push({ icon: Mail, value: userProfile.email });
        if (userProfile?.phone) contactItems.push({ icon: Phone, value: userProfile.phone });
        if (userProfile?.location) contactItems.push({ icon: MapPin, value: userProfile.location });
        if (userProfile?.linkedinUrl) contactItems.push({ icon: Linkedin, value: userProfile.linkedinUrl.replace(/^https?:\/\/(www\.)?/, '') });
        if (userProfile?.portfolioUrl) contactItems.push({ icon: Globe, value: userProfile.portfolioUrl.replace(/^https?:\/\//, '') });
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
        <div className="bg-white mx-auto p-10 font-[Arial,sans-serif] text-black leading-[1.6] text-[11pt]">
            {/* HEADER - Matches HTML template exactly */}
            <header className="text-center mb-6">
                <h1 className="text-[24pt] font-bold mb-3 tracking-tight uppercase">
                    {name}
                </h1>

                {contactItems.length > 0 && (
                    <div className="text-[10pt] text-[#555555] flex justify-center flex-wrap gap-2">
                        {contactItems.map((item, i) => (
                            <div key={i} className="flex items-center gap-1.5 whitespace-nowrap">
                                <item.icon size={12} className="text-[#555555] opacity-50" />
                                <span>{item.value}</span>
                                {i < contactItems.length - 1 && <span className="text-[#cccccc] ml-2">|</span>}
                            </div>
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
