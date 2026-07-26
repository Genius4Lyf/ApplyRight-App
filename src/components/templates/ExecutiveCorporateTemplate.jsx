import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

const ExecutiveCorporateTemplate = ({ markdown, userProfile }) => {
  if (!markdown) return null;

  let name = 'YOUR NAME';
  try {
    const nameMatch = markdown.match(/^#\s+(.+)/m);
    if (nameMatch) name = nameMatch[1];
    else if (userProfile?.firstName)
      name = [userProfile.firstName, userProfile.otherName, userProfile.lastName]
        .filter(Boolean)
        .join(' ')
        .toUpperCase();
  } catch (e) {}

  const roleTitle = userProfile?.currentJobTitle || '';
  const contactItems = [];
  if (userProfile?.email) contactItems.push({ icon: Mail, value: userProfile.email });
  if (userProfile?.phone) contactItems.push({ icon: Phone, value: userProfile.phone });
  if (userProfile?.location) contactItems.push({ icon: MapPin, value: userProfile.location });
  if (userProfile?.linkedinUrl)
    contactItems.push({
      icon: Linkedin,
      value: userProfile.linkedinUrl.replace(/^https?:\/\//, ''),
    });
  if (userProfile?.portfolioUrl)
    contactItems.push({ icon: Globe, value: userProfile.portfolioUrl.replace(/^https?:\/\//, '') });

  const bodyMarkdown = markdown.replace(/^#\s+.+$/m, '');

  return (
    <div
      className="bg-white mx-auto font-sans text-slate-800"
      style={{ lineHeight: 'var(--cv-leading, 1.375)' }}
    >
      <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
            `}</style>

      {/* Header */}
      <header style={{ padding: 'var(--cv-margin, 1.5rem 3rem)' }}>
        <div className="flex justify-between items-start">
          <div>
            {userProfile?.photoUrl && (
              <div className="flex justify-center mb-3">
                <img
                  src={userProfile.photoUrl}
                  alt=""
                  className="w-[72px] h-[72px] rounded-full object-cover border border-slate-200"
                />
              </div>
            )}
            <h1
              className="text-4xl font-extrabold tracking-tighter text-slate-900 mb-2 uppercase"
              style={{
                color: 'var(--cv-accent, #0f172a)',
                fontFamily: "var(--cv-font, 'Inter', sans-serif)",
              }}
            >
              {name}
            </h1>
            {roleTitle && (
              <div
                className="text-sm font-semibold text-slate-500 uppercase tracking-widest"
                style={{ fontFamily: "var(--cv-font, 'Inter', sans-serif)" }}
              >
                {roleTitle}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {contactItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <item.icon size={13} className="text-slate-400" />
              {item.value}
            </div>
          ))}
        </div>
      </header>

      {/* Body */}
      <div
        style={{
          fontFamily: "var(--cv-font, 'Inter', sans-serif)",
          padding: 'var(--cv-margin, 1.5rem 3rem 3rem)',
        }}
      >
        <ReactMarkdown
          components={{
            h1: () => null,
            h2: ({ node, ...props }) => (
              <h2
                className="text-xl font-extrabold text-slate-900 mt-10 mb-4 pb-2 border-b-4 border-slate-200 uppercase tracking-tight"
                style={{
                  color: 'var(--cv-accent, #0f172a)',
                  borderBottomColor: 'var(--cv-accent, #e2e8f0)',
                }}
                {...props}
              />
            ),
            h3: ({ node, ...props }) => (
              <h3 className="text-base font-bold text-slate-800 mt-6 mb-1" {...props} />
            ),
            h4: ({ node, ...props }) => (
              <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase" {...props} />
            ),
            p: ({ node, ...props }) => (
              <p
                className="mb-4 text-justify text-[10pt] leading-6 text-slate-600 font-medium"
                {...props}
              />
            ),
            ul: ({ node, ...props }) => (
              <ul
                className="list-disc pl-5 mb-4 text-[10pt] leading-6 text-slate-600 font-medium marker:text-slate-400"
                {...props}
              />
            ),
            li: ({ node, ...props }) => <li {...props} />,
            strong: ({ node, ...props }) => (
              <strong className="font-extrabold text-slate-900" {...props} />
            ),
            a: ({ node, ...props }) => (
              <a className="text-slate-900 underline decoration-slate-300 font-bold" {...props} />
            ),
          }}
        >
          {bodyMarkdown}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default ExecutiveCorporateTemplate;
