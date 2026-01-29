import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

const MinimalistGridTemplate = ({ markdown, userProfile }) => {
    // Basic checks
    if (!markdown || typeof markdown !== 'string') return null;

    // Extract Name
    let name = 'YOUR NAME';
    try {
        const nameMatch = markdown.match(/^#\s+(.+)/m);
        const extractedName = nameMatch ? nameMatch[1] : null;
        if (extractedName && !extractedName.includes('YOUR NAME')) {
            name = extractedName;
        } else if (userProfile?.firstName) {
            name = [userProfile.firstName, userProfile.otherName, userProfile.lastName].filter(Boolean).join(' ').toUpperCase();
        }
    } catch (e) { }

    const roleTitle = userProfile?.currentJobTitle || '';

    // Contact Info
    const contactItems = [];
    if (userProfile?.email) contactItems.push({ icon: Mail, value: userProfile.email });
    if (userProfile?.phone) contactItems.push({ icon: Phone, value: userProfile.phone });
    if (userProfile?.location) contactItems.push({ icon: MapPin, value: userProfile.location });
    if (userProfile?.portfolioUrl) contactItems.push({ icon: Globe, value: userProfile.portfolioUrl.replace(/^https?:\/\//, '') });
    if (userProfile?.linkedinUrl) contactItems.push({ icon: Linkedin, value: userProfile.linkedinUrl.replace(/^https?:\/\//, '') });

    // Remove first H1
    const bodyMarkdown = markdown.replace(/^#\s+.+$/m, '');

    return (
        <div className="bg-white max-w-[800px] mx-auto min-h-[1000px] font-['Inter',sans-serif] text-slate-800 flex">
            {/* Header / Sidebar (Left 30%) */}
            <div className="w-[30%] bg-slate-50 p-8 border-r border-slate-200">
                <div className="sticky top-8">
                    <h1 className="text-2xl font-bold tracking-tighter text-slate-900 leading-tight mb-2">
                        {name}
                    </h1>
                    {roleTitle && (
                        <div className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-8">
                            {roleTitle}
                        </div>
                    )}

                    <div className="space-y-4 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                        {contactItems.map((item, i) => (
                            <div key={i} className="break-words">
                                <span className="block text-slate-300 text-[8px] mb-0.5 flex items-center gap-1">
                                    <item.icon size={8} className="text-slate-300" />
                                    Contact
                                </span>
                                {item.value}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content (Right 70%) */}
            <div className="w-[70%] p-10 pt-8">
                <div className="cv-body space-y-2">
                    <ReactMarkdown
                        components={{
                            h1: () => null,
                            // H2: Clean section header with spacing
                            h2: ({ node, ...props }) => (
                                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mt-8 mb-4 flex items-center gap-2" {...props} />
                            ),
                            // H3: Job Title - Bold
                            h3: ({ node, ...props }) => (
                                <h3 className="text-sm font-bold text-slate-900 mt-6 mb-0.5" {...props} />
                            ),
                            // H4: Company/Date - Small
                            h4: ({ node, ...props }) => (
                                <h4 className="text-xs font-medium text-slate-500 mb-3" {...props} />
                            ),
                            // Standard text
                            p: ({ node, ...props }) => (
                                <p className="text-[10pt] leading-6 text-slate-600 mb-3" {...props} />
                            ),
                            ul: ({ node, ...props }) => (
                                <ul className="list-none mb-4 space-y-1.5 text-[10pt] leading-6 text-slate-600" {...props} />
                            ),
                            li: ({ node, ...props }) => (
                                <li className="pl-4 border-l border-slate-200 hover:border-indigo-400 transition-colors" {...props} />
                            ),
                            a: ({ node, ...props }) => (
                                <a className="text-indigo-600 font-medium hover:underline" {...props} />
                            ),
                        }}
                    >
                        {bodyMarkdown}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );
};

export default MinimalistGridTemplate;
