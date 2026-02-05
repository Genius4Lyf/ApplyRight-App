import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

const SwissModernTemplate = ({ markdown, userProfile }) => {
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

    // Remove first H1 from markdown body as we'll render it in the header
    let bodyMarkdown = markdown;
    try {
        bodyMarkdown = markdown.replace(/^#\s+.+$/m, '');
    } catch (error) {
        console.error('Error processing markdown:', error);
    }

    return (
        <div className="bg-white mx-auto font-sans text-slate-900 leading-tight">
            {/* INJECT FONTS */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            `}</style>

            <div className="flex min-h-[1000px]">
                {/* LEFT SIDEBAR - ApplyRight Gradient Accent */}
                <div className="w-[12px] bg-gradient-to-b from-indigo-600 via-purple-600 to-indigo-800 flex-shrink-0"></div>

                <div className="flex-1 p-12 pt-16">
                    {/* HEADER - Swiss Style (Big Bold Helvetica-ish) */}
                    <header className="mb-16">
                        <h1 className="text-6xl font-black tracking-tighter text-slate-900 mb-4 leading-[0.9]">
                            {name}
                        </h1>

                        <div className="flex flex-col gap-8">
                            <div>
                                {roleTitle && (
                                    <div className="text-xl font-bold text-slate-900 border-t-4 border-indigo-600 pt-4 mt-2 inline-block pr-12">
                                        {roleTitle}
                                    </div>
                                )}
                            </div>

                            {contactItems.length > 0 && (
                                <div className="flex flex-col items-start gap-1 text-sm font-bold text-slate-500">
                                    {contactItems.map((item, i) => (
                                        <div key={i} className="flex items-center gap-2 hover:text-indigo-600 transition-colors cursor-default">
                                            <item.icon size={16} className="text-slate-400 group-hover:text-indigo-600" />
                                            <span>{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </header>

                    {/* BODY - Grid Layout */}
                    <div className="cv-body">
                        <ReactMarkdown
                            components={{
                                // H1 = Handled in header
                                h1: () => null,

                                // H2 = Section Headers - Big and Bold
                                h2: ({ node, ...props }) => (
                                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-6 mt-12 border-t-4 border-indigo-600 pt-6 first:mt-0" {...props} />
                                ),

                                // H3 = Job Titles
                                h3: ({ node, ...props }) => (
                                    <h3 className="text-xl font-bold text-slate-900 mt-8 mb-1" {...props} />
                                ),

                                // H4 = Company/Date
                                h4: ({ node, ...props }) => (
                                    <h4 className="text-md font-medium text-slate-500 mb-4" {...props} />
                                ),

                                // Paragraphs
                                p: ({ node, ...props }) => (
                                    <p className="text-sm font-medium leading-relaxed text-slate-700 mb-4 max-w-prose" {...props} />
                                ),

                                // Lists
                                ul: ({ node, ...props }) => (
                                    <ul className="list-disc mb-6 space-y-2 text-sm font-medium leading-relaxed text-slate-700 ml-4" {...props} />
                                ),

                                li: ({ node, ...props }) => (
                                    <li className="pl-2 marker:font-black marker:text-indigo-600" {...props} />
                                ),

                                // Strong
                                strong: ({ node, ...props }) => (
                                    <strong className="font-black text-slate-900" {...props} />
                                ),

                                // Links
                                a: ({ node, ...props }) => (
                                    <a className="text-slate-900 font-bold underline decoration-2 decoration-indigo-600" {...props} />
                                ),

                                // HR
                                hr: ({ node, ...props }) => (
                                    <hr className="my-12 border-slate-900 border-2" {...props} />
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

export default SwissModernTemplate;
