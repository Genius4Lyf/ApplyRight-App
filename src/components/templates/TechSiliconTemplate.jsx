import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

const TechSiliconTemplate = ({ markdown, userProfile }) => {
    if (!markdown) return null;

    let name = 'YOUR NAME';
    try {
        const nameMatch = markdown.match(/^#\s+(.+)/m);
        if (nameMatch) name = nameMatch[1];
        else if (userProfile?.firstName) name = [userProfile.firstName, userProfile.lastName].join(' ').toUpperCase();
    } catch (e) { }

    const roleTitle = userProfile?.currentJobTitle || '';
    const contactParts = [];
    if (userProfile?.email) contactParts.push(userProfile.email);
    if (userProfile?.phone) contactParts.push(userProfile.phone);
    if (userProfile?.linkedinUrl) contactParts.push(userProfile.linkedinUrl.replace(/^https?:\/\//, ''));
    if (userProfile?.portfolioUrl) contactParts.push(userProfile.portfolioUrl.replace(/^https?:\/\//, ''));

    const bodyMarkdown = markdown.replace(/^#\s+.+$/m, '');

    return (
        <div className="bg-white max-w-[800px] mx-auto font-sans text-slate-900 leading-relaxed relative overflow-hidden">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            `}</style>

            {/* Background Blob */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-50 to-indigo-100 rounded-full blur-3xl opacity-50 -z-10 translate-x-[20%] -translate-y-[20%]"></div>

            {/* Header */}
            <header className="px-10 py-12">
                <div className="flex flex-col gap-4">
                    <div>
                        <h1 className="text-4xl font-['Inter',sans-serif] font-bold tracking-tight text-slate-900 mb-2">
                            {name}
                        </h1>
                        {roleTitle && (
                            <div className="text-sm font-['Inter',sans-serif] font-semibold text-indigo-600 bg-indigo-50 inline-block px-3 py-1 rounded-full">
                                {roleTitle}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 font-medium">
                        {contactParts.map((part, i) => (
                            <span key={i} className="hover:text-indigo-500 transition-colors cursor-pointer">{part}</span>
                        ))}
                    </div>
                </div>
            </header>

            {/* Body */}
            <div className="px-10 pb-12 font-['Inter',sans-serif]">
                <ReactMarkdown
                    components={{
                        h1: () => null,
                        h2: ({ node, ...props }) => (
                            <h2 className="text-lg font-bold text-slate-900 mt-8 mb-4 flex items-center gap-3" {...props}>
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                                    <span className="text-white text-xs font-bold">#</span>
                                </div>
                                {props.children}
                            </h2>
                        ),
                        h3: ({ node, ...props }) => (
                            <h3 className="text-base font-bold text-slate-800 mt-6 mb-1" {...props} />
                        ),
                        h4: ({ node, ...props }) => (
                            <h4 className="text-xs font-medium text-slate-500 mb-2" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                            <p className="mb-4 text-justify text-[10.5pt] leading-7 text-slate-600" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                            <ul className="list-none space-y-2 mb-4 text-[10.5pt] leading-7 text-slate-600" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                            <li className="pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[10px] before:w-1.5 before:h-1.5 before:bg-indigo-400 before:rounded-full" {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                            <strong className="font-semibold text-slate-900" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                            <a className="text-indigo-600 hover:text-indigo-700 font-medium" {...props} />
                        ),
                    }}
                >
                    {bodyMarkdown}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default TechSiliconTemplate;
