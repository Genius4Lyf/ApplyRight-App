import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

const LuxuryGoldTemplate = ({ markdown, userProfile }) => {
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
        <div className="bg-white max-w-[800px] mx-auto font-sans text-slate-900 leading-relaxed shadow-lg">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&display=swap');
            `}</style>

            {/* Header */}
            <header className="px-16 pt-16 pb-12">
                <div className="flex flex-col items-center text-center">
                    <h1 className="text-5xl font-['Playfair_Display',serif] text-slate-900 mb-6 tracking-wide">
                        {name}
                    </h1>

                    {/* Gold Accent Line */}
                    <div className="w-24 h-1 bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 mb-8 rounded-full"></div>

                    {roleTitle && (
                        <div className="text-sm font-['Lato',sans-serif] font-bold tracking-[0.2em] text-slate-500 uppercase mb-6">
                            {roleTitle}
                        </div>
                    )}

                    <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-400 font-medium tracking-wider uppercase">
                        {contactItems.map((item, i) => (
                            <div key={i} className="flex items-center gap-1 hover:text-amber-500 transition-colors cursor-default">
                                <item.icon size={12} className="text-amber-400" />
                                <span>{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            {/* Body */}
            <div className="px-16 pb-16 font-['Lato',sans-serif]">
                <ReactMarkdown
                    components={{
                        h1: () => null,
                        h2: ({ node, ...props }) => (
                            <h2 className="text-xl font-['Playfair_Display',serif] text-slate-900 mt-10 mb-6 flex items-center gap-4" {...props}>
                                <span className="w-8 h-px bg-amber-300"></span>
                                {props.children}
                            </h2>
                        ),
                        h3: ({ node, ...props }) => (
                            <h3 className="text-base font-bold text-slate-800 mt-6 mb-1" {...props} />
                        ),
                        h4: ({ node, ...props }) => (
                            <h4 className="text-xs font-bold text-amber-600 mb-3 uppercase tracking-wide" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                            <p className="mb-4 text-justify font-light text-slate-600 leading-7 text-[10.5pt]" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                            <ul className="list-none space-y-2 mb-6 text-[10.5pt] font-light text-slate-600" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                            <li className="pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-amber-300" {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                            <strong className="font-bold text-slate-800" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                            <a className="text-amber-600 hover:text-amber-700 underline decoration-amber-200" {...props} />
                        ),
                    }}
                >
                    {bodyMarkdown}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default LuxuryGoldTemplate;
