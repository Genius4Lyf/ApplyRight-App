import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

const ExecutiveStrategyTemplate = ({ markdown, userProfile }) => {
    if (!markdown) return null;

    let name = 'YOUR NAME';
    try {
        const nameMatch = markdown.match(/^#\s+(.+)/m);
        if (nameMatch) name = nameMatch[1];
        else if (userProfile?.firstName) name = [userProfile.firstName, userProfile.lastName].join(' ').toUpperCase();
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
        <div className="bg-white max-w-[800px] mx-auto font-sans text-slate-700 leading-relaxed flex min-h-[1000px]">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap');
            `}</style>

            {/* Sidebar (Left) */}
            <aside className="w-[32%] bg-[#f1f5f9] p-8 border-r border-slate-200 text-right">
                <div className="sticky top-8">
                    <h1 className="text-2xl font-['Open_Sans',sans-serif] font-bold text-[#0f172a] leading-tight mb-2 uppercase break-words">
                        {name}
                    </h1>
                    {roleTitle && (
                        <div className="text-xs font-bold text-[#475569] uppercase tracking-widest mb-8 pb-4 border-b-2 border-[#cbd5e1] inline-block">
                            {roleTitle}
                        </div>
                    )}

                    <div className="flex flex-col gap-4 text-xs font-medium text-[#64748b]">
                        {contactItems.map((item, i) => (
                            <div key={i} className="break-words flex items-center justify-end gap-2 text-right">
                                <span>{item.value}</span>
                                <item.icon size={14} className="text-[#0ea5e9]" />
                            </div>
                        ))}
                    </div>
                </div>
            </aside>

            {/* Main Content (Right) */}
            <main className="w-[68%] p-10 font-['Open_Sans',sans-serif]">
                <ReactMarkdown
                    components={{
                        h1: () => null,
                        h2: ({ node, ...props }) => (
                            <h2 className="text-lg font-bold text-[#334155] uppercase tracking-wide mb-4 mt-8 flex items-center gap-3 before:content-[''] before:w-1.5 before:h-1.5 before:bg-[#0ea5e9] before:rounded-full" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                            <h3 className="text-sm font-bold text-[#1e293b] mt-6 mb-1" {...props} />
                        ),
                        h4: ({ node, ...props }) => (
                            <h4 className="text-xs font-semibold text-[#64748b] mb-2 uppercase" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                            <p className="mb-3 text-justify text-[10.5pt] leading-6 text-[#475569]" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                            <ul className="list-none space-y-2 mb-4 text-[10.5pt] leading-6 text-[#475569]" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                            <li className="pl-3 border-l-2 border-[#e2e8f0]" {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                            <strong className="font-bold text-[#334155]" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                            <a className="text-[#0ea5e9] hover:underline" {...props} />
                        ),
                    }}
                >
                    {bodyMarkdown}
                </ReactMarkdown>
            </main>
        </div>
    );
};

export default ExecutiveStrategyTemplate;
