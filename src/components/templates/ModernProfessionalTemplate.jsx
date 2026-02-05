import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

const ModernProfessionalTemplate = ({ markdown, userProfile }) => {
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
    // Logic: If markdown has valid name (not generic placeholder), use it. Else fallback to profile.
    let name = 'YOUR NAME';
    try {
        const nameMatch = markdown.match(/^#\s+(.+)/m);
        // Basic heuristic: if match is generic, ignore it
        const extractedName = nameMatch ? nameMatch[1] : null;
        const isGeneric = extractedName && (extractedName.includes('YOUR NAME') || extractedName.includes('[Full Name'));

        if (extractedName && !isGeneric) {
            name = extractedName;
        } else if (userProfile?.firstName) {
            // FALLBACK TO PROFILE
            const parts = [userProfile.firstName, userProfile.otherName, userProfile.lastName].filter(Boolean);
            name = parts.join(' ').toUpperCase();
        }
    } catch (error) {
        console.error('Error extracting name:', error);
    }

    // Get role title from profile (safely)
    const roleTitle = userProfile?.currentJobTitle || '';

    // Build contact info line from profile (safely)
    // PRIORITIZE PROFILE DATA as it is verified/onboarded
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

    // Remove first H1 from markdown body as we render it in the header
    let bodyMarkdown = markdown;
    try {
        bodyMarkdown = markdown.replace(/^#\s+.+$/m, '');
    } catch (error) {
        console.error('Error processing markdown:', error);
    }

    return (
        <div className="bg-white mx-auto p-10 font-['Inter',sans-serif] text-[#333333] leading-relaxed text-[10.5pt]">
            {/* INJECT FONTS */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            `}</style>

            {/* HEADER */}
            <header className="border-b-2 border-[#e5e5e5] pb-6 mb-6">
                <h1 className="text-[28pt] font-bold uppercase tracking-tight text-[#111111] mb-2">
                    {name}
                </h1>

                <div className="flex flex-row items-center justify-between text-[#666666]">
                    {roleTitle && (
                        <div className="text-[12pt] font-semibold uppercase tracking-wider mb-0">
                            {roleTitle}
                        </div>
                    )}

                    {contactItems.length > 0 && (
                        <div className="text-[10pt] flex flex-wrap gap-x-4 gap-y-2">
                            {contactItems.map((item, i) => (
                                <div key={i} className="flex items-center gap-1.5 whitespace-nowrap">
                                    <item.icon size={12} className="text-[#666666]" />
                                    <span>{item.value}</span>
                                    {i < contactItems.length - 1 && <span className="text-[#cccccc] ml-2">|</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            {/* BODY */}
            <div className="cv-body">
                <ReactMarkdown
                    components={{
                        // H1 = Handled in header
                        h1: () => null,

                        // H2 = Section Headers
                        // Grey background block for headers as a "modern" touch without using colors
                        h2: ({ node, ...props }) => (
                            <h2 className="text-[11pt] font-bold uppercase tracking-widest text-[#111111] bg-[#f5f5f5] py-2 px-3 mt-8 mb-4 border-l-4 border-[#999999]" {...props} />
                        ),

                        // H3 = Job Titles / Project Names
                        h3: ({ node, ...props }) => (
                            <h3 className="text-[11pt] font-bold text-[#111111] mt-5 mb-1" {...props} />
                        ),

                        // H4 = Company / Degrees
                        h4: ({ node, ...props }) => (
                            <h4 className="text-[11pt] font-medium text-[#444444] mb-2 italic" {...props} />
                        ),

                        // Paragraphs
                        p: ({ node, ...props }) => (
                            <p className="mb-3 text-justify text-[#333333]" {...props} />
                        ),

                        // Lists
                        ul: ({ node, ...props }) => (
                            <ul className="list-disc ml-5 mb-4 space-y-1" {...props} />
                        ),

                        li: ({ node, ...props }) => (
                            <li className="pl-1 marker:text-[#888888]" {...props} />
                        ),

                        // Strong
                        strong: ({ node, ...props }) => (
                            <strong className="font-semibold text-[#111111]" {...props} />
                        ),

                        // Links
                        a: ({ node, ...props }) => (
                            <a className="text-[#333333] underline decoration-[#cccccc] decoration-1 underline-offset-2" {...props} />
                        ),
                    }}
                >
                    {bodyMarkdown}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default ModernProfessionalTemplate;
