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

const ApplyRightMonoTemplate = ({ markdown, userProfile }) => {
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
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
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
  // This replaces a skills-only scrape that also hunted a legacy `- **Languages:**` bullet
  // INSIDE Skills; markdownUtils has emitted a standalone `## Languages` section for a
  // while now, so that block had been silently empty and Languages rendered in the main
  // column instead.
  const {
    sidebar: rail,
    headings: railHeadings,
    mainMarkdown,
  } = planSidebar(markdown, 'applyright-mono', {
    hasPhoto: Boolean(userProfile?.photoUrl),
    contactCount: contactItems.length,
  });

  const railHeading = (text) => (
    <h2 className="mb-3 flex items-center gap-2 text-[8.4pt] font-bold uppercase tracking-[0.18em] text-[#111318] before:h-2 before:w-2 before:bg-[#111318] before:content-['']">
      {text}
    </h2>
  );

  const railSection = (key) =>
    rail[key] ? (
      <section className="mb-7">
        {railHeading(railHeadings[key])}
        <ReactMarkdown
          components={{
            p: (props) => (
              <p className="mb-2 text-[8.7pt] text-[#50545a]" {...elementProps(props)}>
                {props.children}
              </p>
            ),
            ul: (props) => (
              <ul className="space-y-1.5 text-[8.7pt] text-[#50545a]" {...elementProps(props)}>
                {props.children}
              </ul>
            ),
            li: (props) => <li {...elementProps(props)}>{props.children}</li>,
            h3: (props) => (
              <h3 className="text-[8.9pt] font-semibold text-[#111318]" {...elementProps(props)}>
                {props.children}
              </h3>
            ),
            h4: (props) => (
              <h4 className="mb-1 text-[8.2pt] text-[#777c83]" {...elementProps(props)}>
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
      className="mx-auto flex bg-white text-[#111318]"
      style={{
        lineHeight: 'var(--cv-leading, 1.45)',
        fontFamily: "var(--cv-font, 'Inter', system-ui, sans-serif)",
      }}
    >
      <aside
        data-cv-sidebar
        className="w-[32%] shrink-0 border-r-2 border-[#111318] bg-[#f5f5f2] px-7 py-8"
      >
        <div className="relative mx-auto mb-8 h-24 w-24 rounded-full border border-[#111318] p-1.5">
          {userProfile?.photoUrl ? (
            <img
              src={userProfile.photoUrl}
              alt=""
              className="h-full w-full rounded-full object-cover grayscale"
            />
          ) : (
            <div className="grid h-full w-full place-items-center rounded-full bg-[#111318] text-[19pt] font-semibold tracking-[0.1em] text-white">
              {initials}
            </div>
          )}
          <span
            aria-hidden="true"
            className="absolute right-[3px] top-[5px] h-3 w-3 rounded-full border-2 border-[#f5f5f2] bg-[#111318]"
          />
        </div>

        {contactItems.length > 0 && (
          <section className="mb-7">
            {railHeading('Details')}
            <div className="space-y-2 text-[8.7pt] text-[#50545a]">
              {contactItems.map((item) => (
                <div key={item.value} className="flex items-start gap-2 break-all">
                  <item.icon size={10} className="mt-0.5 shrink-0 text-[#777c83]" />
                  <span>{item.value}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {railSection('skills')}
        {railSection('languages')}
        {railSection('certifications')}
        {railSection('education')}
      </aside>

      <main className="w-[68%]" style={{ padding: 'var(--cv-margin, 2.5rem)' }}>
        <header className="mb-7">
          <h1 className="text-[25pt] font-extrabold leading-[1] tracking-[-0.04em] text-[#111318]">
            {name}
          </h1>
          {roleTitle && (
            <p className="mt-2 text-[9.5pt] font-semibold uppercase tracking-[0.13em] text-[#656a71]">
              {roleTitle}
            </p>
          )}
        </header>
        <ReactMarkdown
          components={{
            h1: () => null,
            h2: (props) => (
              <h2
                className="mt-6 mb-3 flex items-center gap-3 text-[9pt] font-bold uppercase tracking-[0.16em] text-[#111318] first:mt-0 after:h-px after:flex-1 after:bg-[#111318]"
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
                className="mb-1.5 text-[8.6pt] font-medium text-[#6a7077]"
                {...elementProps(props)}
              >
                {props.children}
              </h4>
            ),
            p: (props) => (
              <p className="mb-2.5 text-[9.5pt] text-[#444a51]" {...elementProps(props)}>
                {props.children}
              </p>
            ),
            ul: (props) => (
              <ul
                className="mb-3 list-disc space-y-1 pl-[1.15em] text-[9.5pt] text-[#444a51] marker:text-[#111318]"
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
                className="font-medium underline decoration-[#a9adb2] underline-offset-2"
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
    </div>
  );
};

export default ApplyRightMonoTemplate;
