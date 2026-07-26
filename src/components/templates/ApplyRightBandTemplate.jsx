import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Mail, Phone, MapPin, Globe, Linkedin } from 'lucide-react';
import { CV_LABELS } from '../../lib/cvLabels';

// Every localized form (English canonical + translations from cvLabels.js) of a
// given CV_LABELS heading key, escaped for use in a heading regex. The markdown
// handed to templates is already language-localized at the render layer (see
// cvLabels.localizeCvMarkdown) — e.g. "## Skills" becomes "## Compétences" for
// French CVs — so matching only the English literal would silently fail to pull
// the section out for any other language.
const headingForms = (canonicalKey) => {
  const entry = CV_LABELS[canonicalKey];
  const forms = entry ? Array.from(new Set(Object.values(entry).filter(Boolean))) : [canonicalKey];
  return forms.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
};

const ApplyRightBandTemplate = ({ markdown, userProfile }) => {
  // Defensive checks
  if (!markdown || typeof markdown !== 'string') {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>No CV content available</p>
        <p className="text-xs mt-2">Generate a CV from the dashboard to see it here.</p>
      </div>
    );
  }

  // name
  let name = 'YOUR NAME';
  try {
    const nameMatch = markdown.match(/^#\s+(.+)/m);
    name = nameMatch
      ? nameMatch[1]
      : userProfile?.firstName && userProfile?.lastName
        ? [userProfile.firstName, userProfile.otherName, userProfile.lastName].filter(Boolean).join(' ')
        : 'Your Name';
  } catch (error) { console.error('Error extracting name:', error); }

  const roleTitle = userProfile?.currentJobTitle || '';

  const contactItems = [];
  try {
    if (userProfile?.email) contactItems.push({ icon: Mail, value: userProfile.email });
    if (userProfile?.phone) contactItems.push({ icon: Phone, value: userProfile.phone });
    if (userProfile?.location) contactItems.push({ icon: MapPin, value: userProfile.location });
    if (userProfile?.linkedinUrl)
      contactItems.push({ icon: Linkedin, value: userProfile.linkedinUrl.replace(/^https?:\/\/(www\.)?/, '') });
    if (userProfile?.portfolioUrl)
      contactItems.push({ icon: Globe, value: userProfile.portfolioUrl.replace(/^https?:\/\//, '') });
  } catch (error) { console.error('Error building contact info:', error); }

  let bodyMarkdown = markdown;
  try { bodyMarkdown = markdown.replace(/^#\s+.+$/m, ''); } catch (error) {}

  // Generic section extractor — pulls a "## Heading" block out of the shared markdown
  // stream (markdownUtils.js always emits exact "## X" headings, so this is reliable,
  // not a heuristic). `canonicalKey` is the CV_LABELS key, so the match works whether
  // the markdown heading is in English or localized (see headingForms above).
  const extractSection = (md, canonicalKey) => {
    try {
      // (?![\s\S]) is true end-of-string, immune to the /m flag (which makes
      // $ match at every line break, so a lazy capture would otherwise stop
      // after just the section's first line).
      const re = new RegExp(`^##\\s+(?:${headingForms(canonicalKey)})\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|(?![\\s\\S]))`, 'm');
      const m = md.match(re);
      return m ? m[1].trim() : '';
    } catch (e) { return ''; }
  };

  // Split "Languages" out of the Skills section — markdownUtils.js emits a
  // "- **Languages:** value1, value2" bullet when a skill is tagged with that
  // category. "Languages" has no CV_LABELS translation, so it stays literal even
  // in localized markdown — the plain match is safe across languages.
  const splitLanguages = (skillsRaw) => {
    let languagesLine = '';
    let skillsMarkdown = skillsRaw;
    try {
      const langMatch = skillsRaw.match(/^-\s+\*\*Languages:\*\*\s*(.+)$/m);
      if (langMatch) {
        languagesLine = langMatch[1].trim();
        skillsMarkdown = skillsRaw.replace(langMatch[0], '').trim();
      }
    } catch (e) {}
    return { languagesLine, skillsMarkdown };
  };

  const { languagesLine, skillsMarkdown } = splitLanguages(extractSection(bodyMarkdown, 'skills'));
  const mainMarkdown = bodyMarkdown
    .replace(new RegExp(`^##\\s+(?:${headingForms('skills')})\\s*\\n[\\s\\S]*?(?=\\n##\\s+|(?![\\s\\S]))`, 'm'), '')
    .trim();

  return (
    <div
      className="bg-white mx-auto text-[#1a1a1a] text-[10.5pt]"
      style={{ lineHeight: 'var(--cv-leading, 1.4)', fontFamily: "var(--cv-font, 'Inter', system-ui, sans-serif)", padding: 'var(--cv-margin, 2rem)' }}
    >
      <header className="flex items-center gap-4 pb-4 mb-5 border-b-2" style={{ borderColor: 'var(--cv-accent, #1c2b3a)' }}>
        {userProfile?.photoUrl && (
          <img src={userProfile.photoUrl} alt="" className="w-16 h-16 rounded-full object-cover shrink-0 border border-slate-200" />
        )}
        <div>
          <h1 className="text-[18pt] font-bold uppercase tracking-[-0.01em]" style={{ color: 'var(--cv-accent, #1c2b3a)' }}>{name}</h1>
          {roleTitle && <div className="text-[10pt] text-slate-500 font-medium uppercase tracking-[0.05em]">{roleTitle}</div>}
        </div>
      </header>
      <div className="flex gap-8">
        {/* MAIN — wide, left */}
        <div className="w-[68%]">
          <ReactMarkdown components={{
            h1: () => null,
            h2: (p) => <h2 className="text-[11pt] font-bold uppercase tracking-[0.08em] mt-5 mb-2.5 pb-1 border-b border-slate-200 first:mt-0" {...p} />,
            h3: (p) => <h3 className="text-[10.5pt] font-bold mt-3 mb-0.5" {...p} />,
            h4: (p) => <h4 className="text-[9.5pt] font-medium text-slate-500 mb-2" {...p} />,
            p: (p) => <p className="mb-1.5 text-[10.5pt]" {...p} />,
            ul: (p) => <ul className="list-disc ml-5 mb-1.5" {...p} />,
            li: (p) => <li className="mb-0.5" {...p} />,
            strong: (p) => <strong className="font-bold" {...p} />,
            a: (p) => <a className="text-slate-500 no-underline" {...p} />,
          }}>{mainMarkdown}</ReactMarkdown>
        </div>
        {/* SLIM RIGHT COLUMN — thin divider, no fill */}
        <div className="w-[32%] border-l border-slate-200 pl-6">
          {contactItems.length > 0 && (
            <div className="mb-5">
              <h2 className="text-[9pt] font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">Social Links</h2>
              <div className="space-y-1.5 text-[9pt] text-slate-600">
                {contactItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 break-all">
                    <item.icon size={11} className="mt-0.5 shrink-0 text-slate-400" />
                    <span>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {skillsMarkdown && (
            <div className="mb-5">
              <h2 className="text-[9pt] font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">Skills</h2>
              <ReactMarkdown components={{
                p: (p) => <p className="text-[9pt] mb-1.5 text-slate-600" {...p} />,
                ul: (p) => <ul className="text-[9pt] space-y-1.5 list-none text-slate-600" {...p} />,
                li: (p) => <li {...p} />,
                strong: (p) => <strong className="font-semibold text-slate-900" {...p} />,
              }}>{skillsMarkdown}</ReactMarkdown>
            </div>
          )}
          {languagesLine && (
            <div>
              <h2 className="text-[9pt] font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">Languages</h2>
              <p className="text-[9pt] text-slate-600">{languagesLine}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplyRightBandTemplate;
