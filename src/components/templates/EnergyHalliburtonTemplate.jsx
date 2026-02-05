import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

const EnergyHalliburtonTemplate = ({ markdown, userProfile }) => {
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
        <div className="bg-white mx-auto font-sans text-black leading-relaxed shadow-lg border-t-[8px] border-[#CC0000]">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Teko:wght@300;400;500;600;700&family=Roboto:wght@400;500;700&display=swap');
            `}</style>

            {/* Header: Strong Red Bar with Black Text underneath */}
            <header className="px-10 py-8 bg-[#f2f2f2] border-b-2 border-slate-300">
                <div className="flex flex-col gap-0">
                    <h1 className="text-5xl font-['Teko',sans-serif] font-bold text-black mb-0 uppercase tracking-wide leading-none">
                        {name}
                    </h1>
                    {roleTitle && (
                        <div className="text-xl font-['Teko',sans-serif] font-medium text-[#CC0000] uppercase tracking-wider">
                            {roleTitle}
                        </div>
                    )}
                </div>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold font-['Roboto',sans-serif] text-slate-800 uppercase tracking-wide">
                    {contactItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 border-b border-transparent hover:border-[#CC0000] transition-colors">
                            <item.icon size={14} className="text-[#CC0000]" />
                            <span>{item.value}</span>
                        </div>
                    ))}
                </div>
            </header>

            {/* Body */}
            <div className="p-10 font-['Roboto',sans-serif]">
                <ReactMarkdown
                    components={{
                        h1: () => null,
                        h2: ({ node, ...props }) => (
                            <h2 className="text-2xl font-['Teko',sans-serif] font-medium text-black mt-8 mb-4 border-l-4 border-[#CC0000] pl-3 uppercase tracking-wide" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                            <h3 className="text-base font-bold text-black mt-6 mb-1 uppercase" {...props} />
                        ),
                        h4: ({ node, ...props }) => (
                            <h4 className="text-sm font-bold text-slate-500 mb-2 uppercase" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                            <p className="mb-4 text-justify text-[10.5pt] leading-6 text-[#1a1a1a]" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                            <ul className="list-square pl-5 mb-4 text-[10.5pt] leading-6 text-[#1a1a1a] marker:text-[#CC0000]" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                            <li {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                            <strong className="font-bold text-black" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                            <a className="text-[#CC0000] hover:underline font-bold" {...props} />
                        ),
                    }}
                >
                    {bodyMarkdown}
                </ReactMarkdown>
            </div>

            {/* Footer */}

        </div>
    );
};

export default EnergyHalliburtonTemplate;
