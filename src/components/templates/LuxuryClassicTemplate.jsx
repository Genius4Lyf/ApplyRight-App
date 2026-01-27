import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

const LuxuryClassicTemplate = ({ markdown, userProfile }) => {
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
        <div className="bg-[#fcfbf9] max-w-[800px] mx-auto font-serif text-[#2c3e50] leading-relaxed border border-[#e0e0e0] shadow-sm">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,700;1,400&display=swap');
            `}</style>

            {/* Header */}
            <header className="py-12 px-12 border-b-2 border-[#d0d0d0] bg-[#f8f8f8]">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-['EB_Garamond',serif] font-bold tracking-tight text-[#1a252f] mb-1">
                            {name}
                        </h1>
                        {roleTitle && (
                            <div className="text-sm font-['EB_Garamond',serif] italic text-[#546e7a] tracking-wide">
                                {roleTitle}
                            </div>
                        )}
                    </div>

                    <div className="text-right text-xs font-['EB_Garamond',serif] text-[#546e7a] leading-5">
                        {contactParts.map((part, i) => (
                            <div key={i}>{part}</div>
                        ))}
                    </div>
                </div>
            </header>

            {/* Body */}
            <div className="p-12 font-['EB_Garamond',serif]">
                <ReactMarkdown
                    components={{
                        h1: () => null,
                        h2: ({ node, ...props }) => (
                            <h2 className="text-xl font-bold text-[#1a252f] mt-8 mb-4 border-b border-[#d0d0d0] pb-1 uppercase tracking-wider text-xs font-sans" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                            <h3 className="text-lg font-bold text-[#2c3e50] mt-6 mb-1" {...props} />
                        ),
                        h4: ({ node, ...props }) => (
                            <h4 className="text-sm italic text-[#546e7a] mb-3" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                            <p className="mb-4 text-justify text-[11pt] leading-7" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                            <ul className="list-disc pl-5 mb-4 text-[11pt] leading-7 space-y-1 marker:text-[#b0bec5]" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                            <li {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                            <strong className="font-bold text-[#1a252f]" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                            <a className="text-[#34495e] border-b border-[#90a4ae] hover:text-[#1a252f] transition-colors" {...props} />
                        ),
                    }}
                >
                    {bodyMarkdown}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default LuxuryClassicTemplate;
