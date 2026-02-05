import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

const EnergySeplatTemplate = ({ markdown, userProfile }) => {
    if (!markdown) return null;

    let name = 'YOUR NAME';
    try {
        const nameMatch = markdown.match(/^#\s+(.+)/m);
        if (nameMatch) name = nameMatch[1];
        else if (userProfile?.firstName) name = [userProfile.firstName, userProfile.otherName, userProfile.lastName].filter(Boolean).join(' ').toUpperCase();
    } catch (e) { }

    const roleTitle = userProfile?.currentJobTitle || '';
    const contactItems = [];
    if (userProfile?.email) contactItems.push({ icon: Mail, value: userProfile.email });
    if (userProfile?.phone) contactItems.push({ icon: Phone, value: userProfile.phone });
    if (userProfile?.location) contactItems.push({ icon: MapPin, value: userProfile.location });
    if (userProfile?.linkedinUrl) contactItems.push({ icon: Linkedin, value: userProfile.linkedinUrl.replace(/^https?:\/\//, '') });
    if (userProfile?.portfolioUrl) contactItems.push({ icon: Globe, value: userProfile.portfolioUrl.replace(/^https?:\/\//, '') });

    const bodyMarkdown = markdown.replace(/^#\s+.+$/m, '');

    return (
        <div className="bg-white mx-auto font-sans text-slate-800 leading-relaxed shadow-lg border-l-[12px] border-[#008751]">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap');
            `}</style>

            {/* Header: Vertical Layout on Right, clean */}
            <header className="px-10 py-10 flex justify-between items-center border-b border-gray-100">
                <div>
                    <h1 className="text-4xl font-['Lato',sans-serif] font-black text-[#2d3436] mb-2 tracking-wide">
                        {name}
                    </h1>
                    {roleTitle && (
                        <div className="text-lg font-['Lato',sans-serif] font-bold text-[#008751] uppercase tracking-wider">
                            {roleTitle}
                        </div>
                    )}
                </div>
            </header>

            <div className="bg-[#f8f9fa] px-10 py-3 text-sm flex flex-wrap gap-6 text-slate-500 font-medium">
                {contactItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 hover:text-[#008751] transition-colors">
                        <item.icon size={16} className="text-[#008751]" />
                        <span>{item.value}</span>
                    </div>
                ))}
            </div>

            {/* Body */}
            <div className="p-10 font-['Lato',sans-serif]">
                <ReactMarkdown
                    components={{
                        h1: () => null,
                        h2: ({ node, ...props }) => (
                            <h2 className="text-xl font-bold text-[#2d3436] mt-8 mb-4 flex items-center gap-3" {...props}>
                                <div className="h-full w-1 bg-[#008751] self-stretch mr-2 min-h-[1.5em]"></div>
                                {props.children}
                            </h2>
                        ),
                        h3: ({ node, ...props }) => (
                            <h3 className="text-base font-bold text-[#008751] mt-6 mb-1 uppercase tracking-wide" {...props} />
                        ),
                        h4: ({ node, ...props }) => (
                            <h4 className="text-sm font-bold text-slate-400 mb-2 italic" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                            <p className="mb-4 text-justify text-[11pt] leading-7 text-slate-600 font-light" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                            <ul className="list-disc pl-5 mb-4 text-[11pt] leading-7 text-slate-600 font-light marker:text-[#008751]" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                            <li {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                            <strong className="font-bold text-[#2d3436]" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                            <a className="text-[#008751] hover:underline font-medium" {...props} />
                        ),
                    }}
                >
                    {bodyMarkdown}
                </ReactMarkdown>
            </div>

            {/* Minimal Footer */}

        </div>
    );
};

export default EnergySeplatTemplate;
