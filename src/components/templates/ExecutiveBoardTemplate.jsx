import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

const ExecutiveBoardTemplate = ({ markdown, userProfile }) => {
    if (!markdown) return null;

    let name = 'YOUR NAME';
    try {
        const nameMatch = markdown.match(/^#\s+(.+)/m);
        if (nameMatch) name = nameMatch[1];
        else if (userProfile?.firstName) name = [userProfile.firstName, userProfile.lastName].join(' ').toUpperCase();
    } catch (e) { }

    const roleTitle = userProfile?.currentJobTitle || '';
    const contactParts = [];
    if (userProfile?.email) contactParts.push(userProfile.email);
    if (userProfile?.phone) contactParts.push(userProfile.phone);
    if (userProfile?.linkedinUrl) contactParts.push(userProfile.linkedinUrl.replace(/^https?:\/\//, ''));
    if (userProfile?.portfolioUrl) contactParts.push(userProfile.portfolioUrl.replace(/^https?:\/\//, ''));

    const bodyMarkdown = markdown.replace(/^#\s+.+$/m, '');

    return (
        <div className="bg-white max-w-[800px] mx-auto font-sans text-slate-900 leading-snug">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;700;900&family=Merriweather+Sans:wght@300;400;700&display=swap');
            `}</style>

            {/* Header - Boardroom style */}
            <header className="bg-[#0f172a] text-white p-12 border-b-8 border-[#334155]">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-['Roboto_Slab',serif] font-bold tracking-tight mb-2 uppercase text-white">
                            {name}
                        </h1>
                        {roleTitle && (
                            <div className="text-sm font-['Merriweather_Sans',sans-serif] font-bold tracking-wider text-[#94a3b8] uppercase">
                                {roleTitle}
                            </div>
                        )}
                    </div>
                    <div className="text-right text-xs font-['Merriweather_Sans',sans-serif] text-[#cbd5e1] leading-5">
                        {contactParts.map((part, i) => (
                            <div key={i} className="flex items-center justify-end gap-2">
                                <span>{part}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            {/* Body */}
            <div className="p-12 font-['Merriweather_Sans',sans-serif]">
                <ReactMarkdown
                    components={{
                        h1: () => null,
                        h2: ({ node, ...props }) => (
                            <h2 className="text-lg font-['Roboto_Slab',serif] font-bold text-[#0f172a] mt-8 mb-4 border-b-2 border-[#cbd5e1] pb-1 uppercase tracking-tight" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                            <h3 className="text-base font-bold text-[#1e293b] mt-5 mb-1" {...props} />
                        ),
                        h4: ({ node, ...props }) => (
                            <h4 className="text-xs font-bold text-[#475569] mb-2 uppercase" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                            <p className="mb-3 text-justify text-sm leading-6 text-[#334155]" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                            <ul className="list-square pl-5 mb-4 text-sm leading-6 text-[#334155]" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                            <li {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                            <strong className="font-bold text-[#0f172a]" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                            <a className="text-[#0f172a] underline decoration-[#94a3b8] hover:decoration-[#0f172a]" {...props} />
                        ),
                    }}
                >
                    {bodyMarkdown}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default ExecutiveBoardTemplate;
