import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

const TechGoogleTemplate = ({ markdown, userProfile }) => {
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
        <div className="bg-white max-w-[800px] mx-auto font-sans text-[#202124] leading-relaxed relative overflow-hidden">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Google+Sans:wght@400;500;700&display=swap');
            `}</style>

            {/* Top Color Bar */}
            <div className="flex h-1.5 w-full">
                <div className="flex-1 bg-[#4285F4]"></div>
                <div className="flex-1 bg-[#DB4437]"></div>
                <div className="flex-1 bg-[#F4B400]"></div>
                <div className="flex-1 bg-[#0F9D58]"></div>
            </div>

            {/* Header */}
            <header className="px-10 py-8 pb-4">
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <h1 className="text-4xl font-['Roboto',sans-serif] font-normal text-[#202124] mb-1">
                            {name}
                        </h1>
                        {roleTitle && (
                            <div className="text-lg text-[#5f6368] font-light">
                                {roleTitle}
                            </div>
                        )}
                    </div>
                </div>

                {/* Contact Pills */}
                <div className="mt-6 flex flex-wrap gap-3">
                    {contactItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f1f3f4] text-xs font-medium text-[#5f6368] hover:bg-[#e8eaed] transition-colors">
                            {/* Icon Logic based on content if possible, simplistic here */}
                            {i % 4 === 0 ? <item.icon size={14} className="text-[#4285F4]" /> :
                                i % 4 === 1 ? <item.icon size={14} className="text-[#DB4437]" /> :
                                    i % 4 === 2 ? <item.icon size={14} className="text-[#F4B400]" /> :
                                        <item.icon size={14} className="text-[#0F9D58]" />}

                            <span>{item.value}</span>
                        </div>
                    ))}
                </div>
            </header>

            {/* Body */}
            <div className="px-10 pb-12 font-['Roboto',sans-serif]">
                <ReactMarkdown
                    components={{
                        h1: () => null,
                        h2: ({ node, ...props }) => (
                            <h2 className="text-xl font-medium text-[#202124] mt-8 mb-4 flex items-center gap-2" {...props}>
                                {props.children}
                            </h2>
                        ),
                        h3: ({ node, ...props }) => (
                            <h3 className="text-base font-bold text-[#202124] mt-6 mb-1" {...props} />
                        ),
                        h4: ({ node, ...props }) => (
                            <h4 className="text-sm font-medium text-[#5f6368] mb-2" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                            <p className="mb-4 text-justify text-[10.5pt] leading-7 text-[#3c4043]" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                            <ul className="list-disc pl-5 mb-4 text-[10.5pt] leading-7 text-[#3c4043] marker:text-[#9aa0a6]" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                            <li {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                            <strong className="font-medium text-[#202124]" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                            <a className="text-[#1a73e8] hover:underline cursor-pointer font-medium" {...props} />
                        ),
                    }}
                >
                    {bodyMarkdown}
                </ReactMarkdown>
            </div>

            {/* Bottom Accent */}
            <div className="flex h-1 w-full mt-auto opacity-50">
                <div className="flex-1 bg-[#4285F4]"></div>
                <div className="flex-1 bg-[#DB4437]"></div>
                <div className="flex-1 bg-[#F4B400]"></div>
                <div className="flex-1 bg-[#0F9D58]"></div>
            </div>
        </div>
    );
};

export default TechGoogleTemplate;
