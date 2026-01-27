import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

const EnergyTotalTemplate = ({ markdown, userProfile }) => {
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
        <div className="bg-white max-w-[800px] mx-auto font-sans text-slate-700 leading-relaxed shadow-lg overflow-hidden">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Titillium+Web:wght@300;400;600;700&display=swap');
            `}</style>

            {/* Header: Total Gradient Stripe */}
            <div className="h-2 w-full bg-gradient-to-r from-[#D52B1E] via-[#FFD700] via-[#0F9D58] to-[#034EA2]"></div>

            <header className="px-12 py-10 bg-slate-50 border-b border-gray-100">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-5xl font-['Titillium_Web',sans-serif] font-bold text-[#D52B1E] mb-2 tracking-tight">
                            {name}
                        </h1>
                        {roleTitle && (
                            <div className="text-xl font-['Titillium_Web',sans-serif] font-light text-[#034EA2] uppercase tracking-wide">
                                {roleTitle}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm font-semibold text-slate-500">
                    {contactItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 hover:text-[#D52B1E] transition-colors">
                            <item.icon size={16} className="text-[#D52B1E]" />
                            <span>{item.value}</span>
                        </div>
                    ))}
                </div>
            </header>

            {/* Body */}
            <div className="p-12 font-['Titillium_Web',sans-serif]">
                <ReactMarkdown
                    components={{
                        h1: () => null,
                        h2: ({ node, ...props }) => (
                            <h2 className="text-xl font-bold text-[#034EA2] mt-8 mb-4 flex items-center gap-2" {...props}>
                                <div className="w-2 h-2 rounded-full bg-[#D52B1E]"></div>
                                {props.children}
                            </h2>
                        ),
                        h3: ({ node, ...props }) => (
                            <h3 className="text-lg font-bold text-slate-800 mt-6 mb-1" {...props} />
                        ),
                        h4: ({ node, ...props }) => (
                            <h4 className="text-sm font-bold text-black mb-2 uppercase tracking-wide" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                            <p className="mb-4 text-justify text-[11pt] leading-7 text-slate-600" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                            <ul className="list-disc pl-5 mb-4 text-[11pt] leading-7 text-slate-600 marker:text-black" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                            <li {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                            <strong className="font-bold text-black" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                            <a className="text-[#034EA2] hover:underline font-semibold" {...props} />
                        ),
                    }}
                >
                    {bodyMarkdown}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default EnergyTotalTemplate;
