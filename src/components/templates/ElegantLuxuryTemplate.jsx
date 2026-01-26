import React from 'react';
import ReactMarkdown from 'react-markdown';

const ElegantLuxuryTemplate = ({ markdown, userProfile }) => {
    // Defensive checks
    if (!markdown || typeof markdown !== 'string') {
        return (
            <div className="p-8 text-center text-slate-400">
                <p>No CV content available</p>
                <p className="text-xs mt-2">Generate a CV from the dashboard to see it here.</p>
            </div>
        );
    }

    // Extract name from markdown (first H1) or use profile
    let name = 'YOUR NAME';
    try {
        const nameMatch = markdown.match(/^#\s+(.+)/m);
        const extractedName = nameMatch ? nameMatch[1] : null;
        const isGeneric = extractedName && (extractedName.includes('YOUR NAME') || extractedName.includes('[Full Name'));

        if (extractedName && !isGeneric) {
            name = extractedName;
        } else if (userProfile?.firstName) {
            const parts = [userProfile.firstName, userProfile.otherName, userProfile.lastName].filter(Boolean);
            name = parts.join(' ').toUpperCase();
        }
    } catch (error) {
        console.error('Error extracting name:', error);
    }

    // Get role title from profile
    const roleTitle = userProfile?.currentJobTitle || '';

    // Build contact info from profile
    const contactParts = [];
    try {
        if (userProfile?.email) contactParts.push(userProfile.email);
        if (userProfile?.phone) contactParts.push(userProfile.phone);
        if (userProfile?.portfolioUrl) {
            contactParts.push(userProfile.portfolioUrl.replace(/^https?:\/\//, ''));
        }
        if (userProfile?.linkedinUrl) {
            contactParts.push(userProfile.linkedinUrl.replace(/^https?:\/\/(www\.)?/, ''));
        }
    } catch (error) {
        console.error('Error building contact info:', error);
    }

    // Remove first H1 from markdown body as we'll render it in the header
    let bodyMarkdown = markdown;
    try {
        bodyMarkdown = markdown.replace(/^#\s+.+$/m, '');
    } catch (error) {
        console.error('Error processing markdown:', error);
    }

    return (
        <div className="bg-[#fcfbf9] max-w-[800px] mx-auto font-sans text-slate-800 leading-relaxed border border-[#f0eee6]">
            {/* INJECT FONTS */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&display=swap');
            `}</style>

            {/* DECORATIVE BORDER */}
            <div className="h-2 bg-[#c5a059]"></div>

            <div className="p-16">
                {/* HEADER - Centered Luxury */}
                <header className="text-center mb-16 relative">
                    <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[#e5dcc5] -z-10"></div>
                    <div className="inline-block bg-[#fcfbf9] px-10 relative z-10">
                        <h1 className="text-5xl font-['Playfair_Display',serif] text-slate-900 mb-2 tracking-wide font-medium italic">
                            {name}
                        </h1>

                        {roleTitle && (
                            <div className="text-xs font-bold tracking-[0.3em] text-[#c5a059] uppercase mt-4 mb-2">
                                {roleTitle}
                            </div>
                        )}

                        {contactParts.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6 text-[11px] font-bold uppercase tracking-widest text-slate-400 px-8">
                                {contactParts.map((part, i) => (
                                    <span key={i} className="hover:text-[#c5a059] transition-colors">{part}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </header>

                {/* BODY */}
                <div className="cv-body font-['Lato',sans-serif]">
                    <ReactMarkdown
                        components={{
                            // H1 = Handled in header
                            h1: () => null,

                            // H2 = Section Headers - Elegant Serif
                            h2: ({ node, ...props }) => (
                                <h2 className="text-2xl font-['Playfair_Display',serif] text-slate-900 mb-6 mt-12 flex flex-col items-center gap-2" {...props}>
                                    {props.children}
                                    <span className="w-12 h-[2px] bg-[#c5a059]"></span>
                                </h2>
                            ),

                            // H3 = Job Titles
                            h3: ({ node, ...props }) => (
                                <h3 className="text-lg font-bold text-slate-800 mt-8 mb-1 text-center" {...props} />
                            ),

                            // H4 = Company/Date
                            h4: ({ node, ...props }) => (
                                <h4 className="text-xs font-bold text-[#c5a059] mb-4 uppercase tracking-widest text-center" {...props} />
                            ),

                            // Paragraphs
                            p: ({ node, ...props }) => (
                                <p className="text-sm font-light leading-7 text-slate-600 mb-4 text-justify" {...props} />
                            ),

                            // Lists
                            ul: ({ node, ...props }) => (
                                <ul className="list-none mb-6 space-y-2 text-sm font-light leading-7 text-slate-600 text-center" {...props} />
                            ),

                            li: ({ node, ...props }) => (
                                <li className="relative" {...props}>
                                    <span className="text-[#c5a059] mr-2">♦</span>
                                    {props.children}
                                </li>
                            ),

                            // Strong
                            strong: ({ node, ...props }) => (
                                <strong className="font-bold text-slate-800" {...props} />
                            ),

                            // Links
                            a: ({ node, ...props }) => (
                                <a className="text-[#c5a059] hover:text-[#b08d4b] underline decoration-[0.5px] underline-offset-4" {...props} />
                            ),

                            // HR
                            hr: ({ node, ...props }) => (
                                <hr className="my-10 border-[#e5dcc5]" {...props} />
                            ),
                        }}
                    >
                        {bodyMarkdown}
                    </ReactMarkdown>
                </div>
            </div>

            {/* BOTTOM BORDER */}
            <div className="h-2 bg-[#c5a059]"></div>
        </div>
    );
};

export default ElegantLuxuryTemplate;
