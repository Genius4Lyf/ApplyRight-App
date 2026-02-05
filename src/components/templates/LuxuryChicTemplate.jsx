import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

const LuxuryChicTemplate = ({ markdown, userProfile }) => {
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
    if (userProfile?.location || userProfile?.city) contactItems.push({ icon: MapPin, value: userProfile.location || userProfile.city });
    if (userProfile?.linkedinUrl || userProfile?.linkedin) contactItems.push({ icon: Linkedin, value: (userProfile.linkedinUrl || userProfile.linkedin).replace(/^https?:\/\/(www\.)?/, '') });
    if (userProfile?.portfolioUrl || userProfile?.website) contactItems.push({ icon: Globe, value: (userProfile.portfolioUrl || userProfile.website).replace(/^https?:\/\//, '') });

    const bodyMarkdown = markdown.replace(/^#\s+.+$/m, '');

    return (
        <div className="bg-white mx-auto font-sans text-black leading-relaxed">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Montserrat:wght@300;400;500&display=swap');
            `}</style>

            {/* Header - Editorial Style */}
            <header className="pt-20 pb-8 px-16 text-center">
                <h1 className="text-6xl font-['Cinzel',serif] font-black tracking-widest uppercase mb-4 leading-none">
                    {name.split(' ').map((n, i) => (
                        <span key={i} className="block">{n}</span>
                    ))}
                </h1>

                {roleTitle && (
                    <div className="mt-8 text-xs font-['Montserrat',sans-serif] font-bold tracking-[0.4em] uppercase border-y border-black py-3 inline-block px-12">
                        {roleTitle}
                    </div>
                )}

                <div className="mt-8 flex flex-wrap justify-center gap-8 text-xs font-bold tracking-widest uppercase">
                    {contactItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 border-b border-transparent hover:border-black transition-all pb-0.5">
                            <item.icon size={12} className="text-black" />
                            {item.value}
                        </div>
                    ))}
                </div>
            </header>

            {/* Body */}
            <div className="px-16 pb-20 max-w-3xl mx-auto">
                <ReactMarkdown
                    components={{
                        h1: () => null,
                        h2: ({ node, ...props }) => (
                            <h2 className="text-2xl font-['Cinzel',serif] text-black mt-8 mb-8 text-center" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                            <h3 className="text-sm font-['Montserrat',sans-serif] font-bold uppercase tracking-widest text-black mt-10 mb-2 text-center" {...props} />
                        ),
                        h4: ({ node, ...props }) => (
                            <h4 className="text-xs font-['Montserrat',sans-serif] font-light italic text-slate-500 mb-6 text-center" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                            <p className="mb-6 text-center font-['Montserrat',sans-serif] font-light text-sm leading-8 tracking-wide text-slate-800" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                            <ul className="list-none space-y-3 mb-8 text-center font-['Montserrat',sans-serif] font-light text-sm" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                            <li {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                            <strong className="font-medium text-black" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                            <a className="text-black border-b border-black pb-0.5 hover:pb-1 transition-all" {...props} />
                        ),
                        hr: ({ node, ...props }) => (
                            <hr className="my-16 border-black w-12 mx-auto" {...props} />
                        ),
                    }}
                >
                    {bodyMarkdown}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default LuxuryChicTemplate;
