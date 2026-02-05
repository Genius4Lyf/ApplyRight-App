import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

const EnergyNLNGTemplate = ({ markdown, userProfile }) => {
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
        <div className="bg-white mx-auto font-sans text-slate-700 leading-relaxed shadow-lg">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;600;700&display=swap');
            `}</style>

            {/* Header: Clean Green Bar */}
            <div className="bg-[#23854B] h-4 w-full"></div>

            <header className="px-10 py-8 border-b border-gray-200">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-['Public_Sans',sans-serif] font-bold text-[#23854B] tracking-tight">
                            {name}
                        </h1>
                        {roleTitle && (
                            <div className="text-lg font-['Public_Sans',sans-serif] font-medium text-slate-600 mt-1">
                                {roleTitle}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-5 text-sm font-medium text-slate-500">
                    {contactItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 hover:text-[#23854B] transition-colors">
                            <item.icon size={16} className="text-[#23854B]" />
                            <span>{item.value}</span>
                        </div>
                    ))}
                </div>
            </header>

            {/* Body */}
            <div className="p-10 font-['Public_Sans',sans-serif]">
                <ReactMarkdown
                    components={{
                        h1: () => null,
                        h2: ({ node, ...props }) => (
                            <h2 className="text-lg font-bold text-[#23854B] mt-8 mb-4 uppercase tracking-wide border-b border-slate-200 pb-2" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                            <h3 className="text-base font-bold text-slate-800 mt-6 mb-1" {...props} />
                        ),
                        h4: ({ node, ...props }) => (
                            <h4 className="text-sm font-semibold text-slate-500 mb-2 italic" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                            <p className="mb-4 text-justify text-[10.5pt] leading-7 text-slate-600" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                            <ul className="list-disc pl-5 mb-4 text-[10.5pt] leading-7 text-slate-600 marker:text-[#23854B]" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                            <li {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                            <strong className="font-bold text-slate-800" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                            <a className="text-[#23854B] hover:underline font-semibold" {...props} />
                        ),
                    }}
                >
                    {bodyMarkdown}
                </ReactMarkdown>
            </div>


        </div>
    );
};

export default EnergyNLNGTemplate;
