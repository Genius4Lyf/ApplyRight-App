import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

const MinimalistMonoTemplate = ({ markdown, userProfile }) => {
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
            name = [userProfile.firstName, userProfile.lastName].join(' ').toUpperCase();
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
        <div className="bg-white max-w-[800px] mx-auto p-12 font-['JetBrains_Mono',monospace] text-slate-800 leading-relaxed text-[10pt]">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
            `}</style>

            {/* Header */}
            <header className="mb-12 border-b border-dashed border-slate-300 pb-8">
                <h1 className="text-2xl font-bold uppercase tracking-tight text-slate-900 mb-2">
                    {name}
                </h1>
                {roleTitle && (
                    <div className="text-xs uppercase tracking-widest text-slate-500 mb-6 disable-selection">
                        /// {roleTitle}
                    </div>
                )}

                <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                    {contactItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className="text-slate-400">[*]</span>
                            <item.icon size={12} className="text-slate-500" />
                            {item.value}
                        </div>
                    ))}
                </div>
            </header>

            {/* Body */}
            <div className="cv-body space-y-2">
                <ReactMarkdown
                    components={{
                        h1: () => null,
                        h2: ({ node, ...props }) => (
                            <h2 className="text-sm font-bold uppercase bg-slate-100 p-1 pl-2 mb-4 mt-8 select-none" {...props}>
                                {props.children}
                            </h2>
                        ),
                        h3: ({ node, ...props }) => (
                            <h3 className="text-sm font-bold text-slate-900 mt-6 mb-1 underline decoration-slate-300 decoration-dashed underline-offset-4" {...props} />
                        ),
                        h4: ({ node, ...props }) => (
                            <h4 className="text-xs text-slate-500 mb-3" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                            <p className="mb-3 text-justify" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                            <ul className="list-none pl-0 mb-4 space-y-2" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                            <li className="pl-4 relative before:content-['>'] before:absolute before:left-0 before:text-slate-400 before:font-bold" {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                            <strong className="font-bold bg-slate-50 px-0.5 rounded" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                            <a className="text-indigo-600 hover:bg-indigo-50 px-0.5" {...props} />
                        ),
                        hr: ({ node, ...props }) => (
                            <hr className="my-8 border-dashed border-slate-300" {...props} />
                        ),
                    }}
                >
                    {bodyMarkdown}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default MinimalistMonoTemplate;
