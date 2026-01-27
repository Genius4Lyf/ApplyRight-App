import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

const ExecutiveEnergyTemplate = ({ markdown, userProfile }) => {
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
        <div className="bg-white max-w-[800px] mx-auto font-sans text-slate-800 leading-relaxed shadow-lg border-t-8 border-[#003366]">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;700&family=Open+Sans:wght@400;600;700&display=swap');
            `}</style>

            {/* Header */}
            <header className="px-10 py-8 bg-[#f8f9fa] border-b border-[#e9ecef]">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-['Oswald',sans-serif] font-bold text-[#003366] uppercase tracking-wide leading-none mb-2">
                            {name}
                        </h1>
                        {roleTitle && (
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-1 bg-[#cc0000]"></div>
                                <div className="text-sm font-['Open_Sans',sans-serif] font-bold text-[#495057] uppercase tracking-wider">
                                    {roleTitle}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="text-right text-xs font-['Open_Sans',sans-serif] font-semibold text-[#6c757d]">
                        {contactParts.map((part, i) => (
                            <div key={i} className="mb-1 last:mb-0 hover:text-[#003366] transition-colors cursor-default">
                                {part}
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            {/* Body */}
            <div className="p-10 font-['Open_Sans',sans-serif]">
                <ReactMarkdown
                    components={{
                        h1: () => null,
                        h2: ({ node, ...props }) => (
                            <h2 className="text-xl font-['Oswald',sans-serif] font-medium text-[#003366] mt-8 mb-4 border-b-2 border-[#cc0000] pb-1 uppercase inline-block pr-8" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                            <h3 className="text-base font-bold text-[#212529] mt-6 mb-1" {...props} />
                        ),
                        h4: ({ node, ...props }) => (
                            <h4 className="text-sm font-bold text-[#6c757d] mb-2 uppercase" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                            <p className="mb-4 text-justify text-[10.5pt] leading-7 text-[#343a40]" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                            <ul className="list-square pl-5 mb-4 text-[10.5pt] leading-7 text-[#343a40] marker:text-[#003366]" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                            <li {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                            <strong className="font-bold text-[#212529]" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                            <a className="text-[#0056b3] font-bold hover:underline" {...props} />
                        ),
                        hr: ({ node, ...props }) => (
                            <hr className="my-6 border-slate-200" {...props} />
                        ),
                    }}
                >
                    {bodyMarkdown}
                </ReactMarkdown>
            </div>

            {/* Footer Stripe */}
            <div className="h-2 bg-[#cc0000] w-full"></div>
        </div>
    );
};

export default ExecutiveEnergyTemplate;
