import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Terminal, Code, Cpu, Globe, Server, Mail, Phone, MapPin, Linkedin } from 'lucide-react';

const TechDevOpsTemplate = ({ markdown, userProfile }) => {
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
        <div className="bg-[#1e1e1e] mx-auto font-mono text-[#d4d4d4] leading-relaxed shadow-lg border border-[#333]">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;700&display=swap');
                @media print {
                    body, html {
                        background-color: #1e1e1e !important;
                        -webkit-print-color-adjust: exact;
                        margin: 0;
                    }
                    @page {
                        margin: 0;
                    }
                }
            `}</style>

            {/* Header - Terminal Style */}
            <header className="p-8 border-b border-[#333] bg-[#252526]">
                <div className="flex gap-2 mb-6">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                </div>

                <div className="font-['Fira_Code',monospace]">
                    <div className="text-[#4ec9b0] mb-2">$ whoami</div>
                    <h1 className="text-3xl font-bold text-[#ce9178] mb-2">"{name}"</h1>

                    {roleTitle && (
                        <div className="flex items-center gap-2 text-[#569cd6] text-sm mb-6">
                            <span>&gt; role:</span>
                            <span className="text-[#dcdcaa]">"{roleTitle}"</span>
                        </div>
                    )}

                    <div className="text-[#6a9955] text-xs flex flex-wrap gap-6">
                        {contactItems.map((item, i) => (
                            <span key={i} className="flex items-center gap-2">
                                <item.icon size={14} className="text-[#6a9955]" />
                                // {item.value}
                            </span>
                        ))}
                    </div>
                </div>
            </header>

            {/* Body */}
            <div className="p-8 font-['Fira_Code',monospace]">
                <ReactMarkdown
                    components={{
                        h1: () => null,
                        h2: ({ node, ...props }) => (
                            <h2 className="text-lg font-bold text-[#569cd6] mt-8 mb-4 border-b border-[#333] pb-1" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                            <h3 className="text-base font-bold text-[#dcdcaa] mt-6 mb-1" {...props} />
                        ),
                        h4: ({ node, ...props }) => (
                            <h4 className="text-xs font-bold text-[#9cdcfe] mb-2" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                            <p className="mb-3 text-justify text-xs leading-6 text-[#cccccc]" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                            <ul className="list-none space-y-2 mb-4 text-xs leading-6 text-[#cccccc]" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                            <li className="pl-4 relative before:content-['>'] before:absolute before:left-0 before:text-[#569cd6]" {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                            <strong className="font-bold text-[#ce9178]" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                            <a className="text-[#4ec9b0] hover:underline" {...props} />
                        ),
                    }}
                >
                    {bodyMarkdown}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default TechDevOpsTemplate;
