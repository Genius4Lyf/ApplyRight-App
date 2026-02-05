import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

const LuxuryRoyalTemplate = ({ markdown, userProfile }) => {
    if (!markdown) return null;

    let name = 'YOUR NAME';
    try {
        const nameMatch = markdown.match(/^#\s+(.+)/m);
        if (nameMatch) name = nameMatch[1];
        else if (userProfile?.firstName) name = [userProfile.firstName, userProfile.otherName, userProfile.lastName].filter(Boolean).join(' ').toUpperCase();
    } catch (e) { }

    const roleTitle = userProfile?.currentJobTitle || '';
    const contactParts = [];
    if (userProfile?.email) contactParts.push({ icon: <Mail size={10} />, value: userProfile.email });
    if (userProfile?.phone) contactParts.push({ icon: <Phone size={10} />, value: userProfile.phone });
    if (userProfile?.linkedinUrl) contactParts.push({ icon: <Linkedin size={10} />, value: userProfile.linkedinUrl.replace(/^https?:\/\//, '') });
    if (userProfile?.portfolioUrl) contactParts.push({ icon: <Globe size={10} />, value: userProfile.portfolioUrl.replace(/^https?:\/\//, '') });

    const bodyMarkdown = markdown.replace(/^#\s+.+$/m, '');

    return (
        <div className="bg-slate-900 mx-auto font-['Playfair_Display',serif] text-slate-300 leading-relaxed min-h-[297mm]">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Lato:wght@300;400&display=swap');
            `}</style>

            {/* Header */}
            <header className="text-center pt-16 pb-6 px-10 bg-slate-900 relative">
                <div className="w-24 h-24 mx-auto border-2 border-amber-500 rounded-full flex items-center justify-center mb-6">
                    <span className="text-4xl text-amber-500 font-black italic">{name.charAt(0)}</span>
                </div>
                <h1 className="text-5xl font-black text-amber-500 tracking-wide uppercase mb-4">{name}</h1>
                <div className="w-24 h-1 bg-amber-600 mx-auto mb-6"></div>
                {roleTitle && <div className="text-sm uppercase tracking-[0.3em] text-slate-400 mb-8 font-sans">{roleTitle}</div>}

                <div className="flex flex-wrap justify-center gap-6 text-xs text-amber-100/60 font-sans">
                    {contactParts.map((part, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className="text-amber-500">{part.icon}</span>
                            <span>{part.value}</span>
                        </div>
                    ))}
                </div>
            </header>

            {/* Body */}
            <div className="px-12 pb-12 pt-2 font-['Lato',sans-serif]">
                <ReactMarkdown
                    components={{
                        h1: () => null,
                        h2: ({ node, ...props }) => (
                            <h2 className="text-2xl font-['Playfair_Display',serif] text-amber-500 mt-6 mb-6 pb-2 border-b border-amber-900/50 text-center italic break-after-avoid" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                            <h3 className="text-lg font-bold text-amber-100 mt-8 mb-1 text-center" {...props} />
                        ),
                        h4: ({ node, ...props }) => (
                            <h4 className="text-xs uppercase tracking-widest text-slate-500 mb-4 text-center" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                            <p className="mb-4 text-center font-light opacity-90 leading-7" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                            <ul className="list-none space-y-2 mb-6" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                            <li className="opacity-90 text-center block break-inside-avoid" {...props}>
                                <span className="text-amber-700 mr-2">❖</span>
                                {props.children}
                            </li>
                        ),
                        strong: ({ node, ...props }) => (
                            <strong className="text-amber-200 font-bold" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                            <a className="text-amber-400 hover:text-amber-300 transition-colors underline decoration-amber-900" {...props} />
                        ),
                    }}
                >
                    {bodyMarkdown}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default LuxuryRoyalTemplate;
