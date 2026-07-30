import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Mail, Phone, MapPin, Globe, Linkedin } from 'lucide-react';

// Matches the wrapper's left padding so H2 section labels can break back out
// flush-left, past the accent spine.
const SPINE_INDENT = 16;

// Career-progression template for operators / general managers: a single
// accent spine runs down the whole body with a small node at every entry
// title, visually narrating the climb. Structural, not decorative — content
// stays single-column and linear, so it reads fine for ATS either way.
const TheAscentTemplate = ({ markdown, userProfile }) => {
  if (!markdown || typeof markdown !== 'string') {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>No CV content available</p>
        <p className="text-xs mt-2">Generate a CV from the dashboard to see it here.</p>
      </div>
    );
  }

  // Extract name from markdown (first H1) or use profile
  let name = 'Your Name';
  try {
    const nameMatch = markdown.match(/^#\s+(.+)/m);
    const extractedName = nameMatch ? nameMatch[1] : null;
    const isGeneric =
      extractedName &&
      (extractedName.includes('YOUR NAME') || extractedName.includes('[Full Name'));
    if (extractedName && !isGeneric) {
      name = extractedName;
    } else if (userProfile?.firstName) {
      name = [userProfile.firstName, userProfile.otherName, userProfile.lastName]
        .filter(Boolean)
        .join(' ');
    }
  } catch (error) {
    console.error('Error extracting name:', error);
  }

  const roleTitle = userProfile?.currentJobTitle || '';

  const contactItems = [];
  try {
    if (userProfile?.email) contactItems.push({ icon: Mail, value: userProfile.email });
    if (userProfile?.phone) contactItems.push({ icon: Phone, value: userProfile.phone });
    if (userProfile?.location) contactItems.push({ icon: MapPin, value: userProfile.location });
    if (userProfile?.linkedinUrl)
      contactItems.push({
        icon: Linkedin,
        value: userProfile.linkedinUrl.replace(/^https?:\/\/(www\.)?/, ''),
      });
    if (userProfile?.portfolioUrl)
      contactItems.push({
        icon: Globe,
        value: userProfile.portfolioUrl.replace(/^https?:\/\//, ''),
      });
  } catch (error) {
    console.error('Error building contact info:', error);
  }

  // Remove first H1 from markdown body
  let bodyMarkdown = markdown;
  try {
    bodyMarkdown = markdown.replace(/^#\s+.+$/m, '');
  } catch (error) {
    console.error('Error processing markdown:', error);
  }

  return (
    <div
      className="bg-[#fbfaf7] mx-auto text-[#1e1c17]"
      style={{
        lineHeight: 'var(--cv-leading, 1.62)',
        fontFamily: "var(--cv-font, 'Source Sans 3', system-ui, sans-serif)",
        padding: 'var(--cv-margin, 2.9rem 3.1rem)',
      }}
    >
      {/* INJECT FONTS */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Literata:wght@500;600&family=Source+Sans+3:wght@400;600&display=swap');
      `}</style>

      {/* HEADER */}
      <header className="mb-3">
        {userProfile?.photoUrl && (
          <img
            src={userProfile.photoUrl}
            alt=""
            className="w-16 h-16 rounded-full object-cover mb-3 border border-[#e7e1d4]"
          />
        )}
        <h1
          className="text-[20.5pt] leading-none mb-1"
          style={{ fontFamily: "'Literata', serif", fontWeight: 600, letterSpacing: '-0.01em' }}
        >
          {name}
        </h1>

        {roleTitle && (
          <div
            className="text-[9.5pt] font-semibold mb-2"
            style={{ fontFamily: "'Source Sans 3', sans-serif", color: 'var(--cv-accent, #52602e)' }}
          >
            {roleTitle}
          </div>
        )}

        {contactItems.length > 0 && (
          <div
            className="text-[8.4pt] flex flex-wrap"
            style={{ color: '#6e675b', borderBottom: '1px solid #e7e1d4', paddingBottom: 9 }}
          >
            {contactItems.map((item, i) => (
              <span key={i} className="flex items-center whitespace-nowrap">
                <item.icon size={11} className="mr-1.5 opacity-70" />
                {item.value}
                {i < contactItems.length - 1 && (
                  <span className="mx-2.5" style={{ color: '#c9c2b2' }}>
                    ·
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* BODY — the accent spine runs down the whole column; H2 escapes it via
          a matching negative margin so section labels stay flush-left. */}
      <div style={{ borderLeft: '2px solid var(--cv-accent, #52602e)', paddingLeft: SPINE_INDENT }}>
        <ReactMarkdown
          components={{
            h1: () => null,

            h2: ({ node, ...props }) => (
              <h2
                className="text-[9.7pt] font-semibold mt-4 mb-2 first:mt-0"
                style={{ fontFamily: "'Literata', serif", color: '#1e1c17', marginLeft: -SPINE_INDENT }}
                {...props}
              />
            ),

            // H3 = entry titles (role / degree / project) — each gets a small
            // accent node sitting on the spine, marking a milestone.
            h3: ({ node, children, ...props }) => (
              <h3
                className="relative text-[10.2pt] font-semibold mt-3 mb-0.5"
                style={{ color: '#1e1c17' }}
                {...props}
              >
                <span
                  aria-hidden="true"
                  className="absolute rounded-full"
                  style={{
                    left: -19,
                    top: '0.55em',
                    width: 7,
                    height: 7,
                    background: 'var(--cv-accent, #52602e)',
                    boxShadow: '0 0 0 2px #fbfaf7',
                  }}
                />
                {children}
              </h3>
            ),

            h4: ({ node, ...props }) => (
              <h4 className="text-[8.6pt] mb-1" style={{ color: '#6e675b' }} {...props} />
            ),

            p: ({ node, ...props }) => <p className="text-[9.8pt] mb-2" {...props} />,

            ul: ({ node, ...props }) => <ul className="list-disc pl-[1.1em] mb-2" {...props} />,

            li: ({ node, ...props }) => <li className="mb-1 text-[9.8pt]" {...props} />,

            strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,

            a: ({ node, ...props }) => (
              <a className="underline" style={{ color: 'var(--cv-accent, #52602e)' }} {...props} />
            ),
          }}
        >
          {bodyMarkdown}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default TheAscentTemplate;
