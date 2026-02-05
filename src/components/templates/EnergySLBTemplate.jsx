import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

const EnergySLBTemplate = ({ markdown, userProfile }) => {
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
        <div className="bg-white mx-auto font-sans text-slate-800 leading-relaxed shadow-lg">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Arimo:wght@400;700&display=swap');
            `}</style>

            {/* Header: SLB Blue Block */}
            <header className="bg-[#0114DC] text-white px-10 py-8">
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-['Arimo',sans-serif] font-bold uppercase tracking-tight text-white">
                        {name}
                    </h1>
                    {roleTitle && (
                        <div className="text-lg font-['Arimo',sans-serif] font-normal opacity-90">
                            {roleTitle}
                        </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium opacity-90">
                        {contactItems.map((item, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <item.icon size={16} className="text-white opacity-90" />
                                <span>{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            {/* Body */}
            <div className="p-10 font-['Arimo',sans-serif]">
                <ReactMarkdown
                    components={{
                        h1: () => null,
                        h2: ({ node, ...props }) => (
                            <h2 className="text-xl font-bold text-[#0114DC] mt-8 mb-4 border-b-2 border-[#0114DC] pb-1 uppercase" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                            <h3 className="text-base font-bold text-[#2d3436] mt-6 mb-1" {...props} />
                        ),
                        h4: ({ node, ...props }) => (
                            <h4 className="text-sm font-bold text-black mb-2 uppercase tracking-wide" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                            <p className="mb-4 text-justify text-[10.5pt] leading-6 text-[#2d3436]" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                            <ul className="list-disc pl-5 mb-4 text-[10.5pt] leading-6 text-[#2d3436] marker:text-black" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                            <li {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                            <strong className="font-bold text-black" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                            <a className="text-[#0114DC] hover:underline hover:text-blue-800" {...props} />
                        ),
                    }}
                >
                    {bodyMarkdown}
                </ReactMarkdown>
            </div>


        </div>
    );
};

export default EnergySLBTemplate;
