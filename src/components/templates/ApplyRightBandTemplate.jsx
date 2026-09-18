import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Globe, Linkedin, Mail, MapPin, Phone } from 'lucide-react';
import { planSidebar } from '../../lib/cvSidebarSections';

const elementProps = (props) => {
  const clean = { ...props };
  delete clean.node;
  delete clean.children;
  return clean;
};

const ApplyRightBandTemplate = ({ markdown, userProfile, variant = 'ink' }) => {
  if (!markdown || typeof markdown !== 'string') {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>No CV content available</p>
        <p className="mt-2 text-xs">Generate a CV from the dashboard to see it here.</p>
      </div>
    );
  }

  const markdownName = markdown.match(/^#\s+(.+)/m)?.[1]?.trim();
  const profileName = [userProfile?.firstName, userProfile?.otherName, userProfile?.lastName]
    .filter(Boolean)
    .join(' ');
  const name =
    markdownName && !/your name|full name/i.test(markdownName)
      ? markdownName
      : profileName || 'Your Name';
  const roleTitle = userProfile?.currentJobTitle || '';
  const contactItems = [
    userProfile?.email && { icon: Mail, value: userProfile.email },
    userProfile?.phone && { icon: Phone, value: userProfile.phone },
    userProfile?.location && { icon: MapPin, value: userProfile.location },
    userProfile?.linkedinUrl && {
      icon: Linkedin,
      value: userProfile.linkedinUrl.replace(/^https?:\/\/(www\.)?/, ''),
    },
    userProfile?.portfolioUrl && {
      icon: Globe,
      value: userProfile.portfolioUrl.replace(/^https?:\/\//, ''),
    },
  ].filter(Boolean);
  // What the rail can hold, decided before anything renders — see lib/cvSidebarSections.
  // Contact lives in the masthead here, not the rail, so the rail's budget starts full.
  // Replaces a skills-only scrape that also hunted a legacy `- **Languages:**` bullet
  // inside Skills; markdownUtils emits a standalone `## Languages` section now.
  const {
    sidebar: rail,
    headings: railHeadings,
    mainMarkdown,
  } = planSidebar(markdown, 'applyright-band');
  const isPaperBand = variant === 'paper';

  const railSection = (key) =>
    rail[key] ? (
      <section className="mb-6">
        <h2 className="mb-3 text-[8.4pt] font-bold uppercase tracking-[0.18em] text-[#7a828c]">
          {railHeadings[key]}
        </h2>
        <ReactMarkdown
          components={{
            p: (props) => (
              <p className="mb-2 text-[8.8pt] text-[#505862]" {...elementProps(props)}>
                {props.children}
              </p>
            ),
            ul: (props) => (
              <ul className="space-y-1.5 text-[8.8pt] text-[#505862]" {...elementProps(props)}>
                {props.children}
              </ul>
            ),
            li: (props) => <li {...elementProps(props)}>{props.children}</li>,
            h3: (props) => (
              <h3 className="text-[9pt] font-semibold text-[#111318]" {...elementProps(props)}>
                {props.children}
              </h3>
            ),
            h4: (props) => (
              <h4 className="mb-1 text-[8.2pt] text-[#7a828c]" {...elementProps(props)}>
                {props.children}
              </h4>
            ),
            strong: (props) => (
              <strong className="font-semibold text-[#111318]" {...elementProps(props)}>
                {props.children}
              </strong>
            ),
          }}
        >
          {rail[key]}
        </ReactMarkdown>
      </section>
    ) : null;

  return (
    <div
      className="mx-auto bg-white text-[#111318]"
      style={{
        lineHeight: 'var(--cv-leading, 1.45)',
        fontFamily: "var(--cv-font, 'Inter', system-ui, sans-serif)",
      }}
    >
      <header
        className={`px-10 py-6 ${
          isPaperBand
            ? 'border-y-2 border-[#111318] bg-[#f5f5f2] text-[#111318]'
            : 'bg-[#090d18] text-white'
        }`}
      >
        <div className="flex items-start justify-between gap-8">
          <div className="flex min-w-0 items-start gap-5">
            <div
              aria-hidden="true"
              className={`relative mt-1 h-10 w-10 shrink-0 rounded-full border ${
                isPaperBand ? 'border-[#111318]/35' : 'border-white/30'
              }`}
            >
              <span
                className={`absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                  isPaperBand ? 'bg-[#111318]' : 'bg-white'
                }`}
              />
              <span
                className={`absolute right-[2px] top-[3px] h-2 w-2 rounded-full ${
                  isPaperBand ? 'bg-[#111318]' : 'bg-white'
                }`}
              />
            </div>
            <div className="min-w-0">
              <h1
                className={`text-[27pt] font-extrabold leading-[0.98] tracking-[-0.04em] ${
                  isPaperBand ? 'text-[#111318]' : 'text-white'
                }`}
              >
                {name}
              </h1>
              {roleTitle && (
                <p
                  className={`mt-2 text-[9.5pt] font-semibold uppercase tracking-[0.14em] ${
                    isPaperBand ? 'text-[#111318]/60' : 'text-white/65'
                  }`}
                >
                  {roleTitle}
                </p>
              )}
            </div>
          </div>
          {userProfile?.photoUrl && (
            <img
              src={userProfile.photoUrl}
              alt=""
              className={`h-[68px] w-[60px] shrink-0 border object-cover grayscale ${
                isPaperBand ? 'border-[#111318]/30' : 'border-white/25'
              }`}
            />
          )}
        </div>

        {contactItems.length > 0 && (
          <div
            className={`mt-4 grid grid-cols-2 gap-x-8 gap-y-2 border-t pt-3 text-[8pt] ${
              isPaperBand
                ? 'border-[#111318]/20 text-[#111318]/70'
                : 'border-white/15 text-white/70'
            }`}
          >
            {contactItems.map((item) => (
              <div key={item.value} className="flex min-w-0 items-center gap-2">
                <item.icon
                  size={10}
                  className={`shrink-0 ${isPaperBand ? 'text-[#111318]/45' : 'text-white/45'}`}
                />
                <span className="truncate">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </header>

      <div className="flex gap-8 px-10 py-7">
        <main className="w-[68%]">
          <ReactMarkdown
            components={{
              h1: () => null,
              h2: (props) => (
                <h2
                  className="mt-5 mb-3 text-[9pt] font-bold uppercase tracking-[0.16em] text-[#111318] first:mt-0"
                  {...elementProps(props)}
                >
                  {props.children}
                </h2>
              ),
              h3: (props) => (
                <h3
                  className="mt-4 mb-0.5 text-[10.5pt] font-bold text-[#111318]"
                  {...elementProps(props)}
                >
                  {props.children}
                </h3>
              ),
              h4: (props) => (
                <h4
                  className="mb-1.5 text-[8.6pt] font-medium text-[#68707a]"
                  {...elementProps(props)}
                >
                  {props.children}
                </h4>
              ),
              p: (props) => (
                <p className="mb-2.5 text-[9.5pt] text-[#404751]" {...elementProps(props)}>
                  {props.children}
                </p>
              ),
              ul: (props) => (
                <ul
                  className="mb-3 list-disc space-y-1 pl-[1.15em] text-[9.5pt] text-[#404751] marker:text-[#111318]"
                  {...elementProps(props)}
                >
                  {props.children}
                </ul>
              ),
              li: (props) => <li {...elementProps(props)}>{props.children}</li>,
              strong: (props) => (
                <strong className="font-bold text-[#111318]" {...elementProps(props)}>
                  {props.children}
                </strong>
              ),
              a: (props) => (
                <a
                  className="font-medium underline decoration-[#a9afb7] underline-offset-2"
                  {...elementProps(props)}
                >
                  {props.children}
                </a>
              ),
            }}
          >
            {mainMarkdown}
          </ReactMarkdown>
        </main>

        {/* The rail sits on the RIGHT and is last in flow, which buildPrintHtml has to be
            told: pinned for print, it anchors to the right edge and pushes the main column
            with a right margin. The bare attribute means a left rail. */}
        <aside data-cv-sidebar="right" className="w-[32%] border-l border-[#d9dce1] pl-6">
          {railSection('skills')}
          {railSection('languages')}
          {railSection('certifications')}
          {railSection('education')}
        </aside>
      </div>
    </div>
  );
};

export default ApplyRightBandTemplate;
