import React from 'react';
import ReactMarkdown from 'react-markdown';

// Editorial masthead template for brand/comms/creative-leadership CVs — a
// serif byline instead of a corporate heading, contact rendered as a single
// credits line (no icons), and the professional summary set as a pulled
// quote. Single linear column throughout, so it stays ATS-parseable.
const TheProfileTemplate = ({ markdown, userProfile }) => {
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

  // Credits-line contact info — plain text, dot-separated, no icons (the
  // masthead treatment is deliberately quieter than the other templates').
  const contactItems = [];
  try {
    if (userProfile?.location) contactItems.push(userProfile.location);
    if (userProfile?.email) contactItems.push(userProfile.email);
    if (userProfile?.phone) contactItems.push(userProfile.phone);
    if (userProfile?.linkedinUrl)
      contactItems.push(userProfile.linkedinUrl.replace(/^https?:\/\/(www\.)?/, ''));
    if (userProfile?.portfolioUrl)
      contactItems.push(userProfile.portfolioUrl.replace(/^https?:\/\//, ''));
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

  // The first <p> in the body is always the Professional Summary paragraph
  // (fixed section order, so this holds regardless of the heading's — even
  // localized — text). It renders as a pulled quote; every later paragraph
  // renders as normal body copy.
  let quoteUsed = false;

  return (
    <div
      className="bg-[#faf8f4] mx-auto text-[#221f1c]"
      style={{
        lineHeight: 'var(--cv-leading, 1.56)',
        fontFamily: "var(--cv-font, 'Work Sans', system-ui, sans-serif)",
        padding: 'var(--cv-margin, 2.7rem 2.95rem)',
      }}
    >
      {/* INJECT FONTS */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,500;0,600;1,500&family=Work+Sans:wght@400;500;600&display=swap');
      `}</style>

      {/* HEADER */}
      <header className="mb-3">
        {userProfile?.photoUrl && (
          <img
            src={userProfile.photoUrl}
            alt=""
            className="w-14 h-14 rounded-full object-cover mb-3 border border-[#e6e0d6]"
          />
        )}
        <h1
          className="text-[25.5pt] leading-none mb-1"
          style={{
            fontFamily: "'Newsreader', serif",
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: '#221f1c',
          }}
        >
          {name}
        </h1>

        {roleTitle && (
          <div
            className="text-[8.4pt] font-semibold uppercase mb-2.5"
            style={{
              fontFamily: "'Work Sans', sans-serif",
              letterSpacing: '0.13em',
              color: 'var(--cv-accent, #6d3955)',
            }}
          >
            {roleTitle}
          </div>
        )}

        {contactItems.length > 0 && (
          <div
            className="text-[8.2pt] flex flex-wrap"
            style={{
              color: '#79726a',
              borderTop: '1px solid #e6e0d6',
              borderBottom: '1px solid #e6e0d6',
              padding: '6px 0',
            }}
          >
            {contactItems.map((item, i) => (
              <span key={i} className="whitespace-nowrap">
                {item}
                {i < contactItems.length - 1 && (
                  <span className="mx-2.5" style={{ color: '#cbc4b7' }}>
                    ·
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* BODY */}
      <ReactMarkdown
        components={{
          h1: () => null,

          // H2 = Section labels, small caps with a short accent "flag" underline
          h2: ({ node, children, ...props }) => (
            <h2 className="inline-block mt-3.5 mb-2 first:mt-0" {...props}>
              <span
                className="block text-[8.6pt] font-semibold uppercase"
                style={{ fontFamily: "'Work Sans', sans-serif", letterSpacing: '0.13em', color: '#221f1c' }}
              >
                {children}
              </span>
              <span
                className="block mt-1"
                style={{ width: 20, height: 2, background: 'var(--cv-accent, #6d3955)' }}
              />
            </h2>
          ),

          // H3 = Role / entry titles, set in the serif like a byline
          h3: ({ node, ...props }) => (
            <h3
              className="text-[11pt] mt-2.5 mb-0.5"
              style={{ fontFamily: "'Newsreader', serif", fontWeight: 500, color: '#221f1c' }}
              {...props}
            />
          ),

          // H4 = Company / institution + dates
          h4: ({ node, ...props }) => (
            <h4
              className="text-[8.4pt] uppercase mb-1.5"
              style={{ fontFamily: "'Work Sans', sans-serif", letterSpacing: '0.04em', color: '#79726a' }}
              {...props}
            />
          ),

          // First paragraph = pulled-quote summary; every other paragraph = body copy
          p: ({ node, ...props }) => {
            if (!quoteUsed) {
              quoteUsed = true;
              return (
                <p
                  className="text-[12pt] italic mb-4"
                  style={{
                    fontFamily: "'Newsreader', serif",
                    fontWeight: 500,
                    lineHeight: 1.5,
                    color: '#221f1c',
                    paddingLeft: 15,
                    borderLeft: '2px solid var(--cv-accent, #6d3955)',
                  }}
                  {...props}
                />
              );
            }
            return <p className="text-[9.7pt] mb-2" {...props} />;
          },

          ul: ({ node, ...props }) => <ul className="list-disc pl-[1.15em] mb-2" {...props} />,

          li: ({ node, ...props }) => <li className="mb-1 text-[9.7pt]" {...props} />,

          strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,

          a: ({ node, ...props }) => (
            <a className="underline" style={{ color: 'var(--cv-accent, #6d3955)' }} {...props} />
          ),
        }}
      >
        {bodyMarkdown}
      </ReactMarkdown>
    </div>
  );
};

export default TheProfileTemplate;
