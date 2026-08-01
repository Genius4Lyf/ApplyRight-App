import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Globe, Linkedin, Mail, MapPin, Phone } from 'lucide-react';

const elementProps = (props) => {
  const clean = { ...props };
  delete clean.node;
  delete clean.children;
  return clean;
};

const TheAscentTemplate = ({ markdown, userProfile }) => {
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
  const bodyMarkdown = markdown.replace(/^#\s+.+$/m, '').trim();

  return (
    <div
      className="mx-auto bg-white text-[#282725]"
      style={{
        lineHeight: 'var(--cv-leading, 1.52)',
        fontFamily: "var(--cv-font, 'Source Sans 3', sans-serif)",
        padding: 'var(--cv-margin, 2.7rem 3rem)',
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Literata:wght@500;600&family=Source+Sans+3:wght@400;600;700&display=swap');`}</style>

      <header className="relative mb-7 border-b border-[#d9d4ca] pb-6 pr-28">
        <h1
          className="text-[27pt] font-semibold leading-[1.03] tracking-[-0.025em] text-[#272521]"
          style={{ fontFamily: "'Literata', serif" }}
        >
          {name}
        </h1>
        {roleTitle && (
          <p
            className="mt-2 text-[10pt] font-semibold"
            style={{ color: 'var(--cv-accent, #9b5d30)' }}
          >
            {roleTitle}
          </p>
        )}

        <div aria-hidden="true" className="absolute right-0 top-1 flex items-end gap-1.5">
          <span className="block h-4 w-5 bg-[#d8c4b3]" />
          <span className="block h-8 w-5 bg-[#bd906d]" />
          <span className="block h-12 w-5" style={{ background: 'var(--cv-accent, #9b5d30)' }} />
        </div>

        {contactItems.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[8.2pt] text-[#6a655f]">
            {contactItems.map((item) => (
              <div key={item.value} className="flex items-center gap-1.5">
                <item.icon size={10} style={{ color: 'var(--cv-accent, #9b5d30)' }} />
                <span>{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </header>

      <ReactMarkdown
        components={{
          h1: () => null,
          h2: (props) => (
            <h2
              className="mt-6 mb-3 border-l-[5px] pl-3 text-[10pt] font-semibold uppercase tracking-[0.12em] text-[#302e2a] first:mt-0"
              style={{ borderColor: 'var(--cv-accent, #9b5d30)', fontFamily: "'Literata', serif" }}
              {...elementProps(props)}
            >
              {props.children}
            </h2>
          ),
          h3: (props) => (
            <h3
              className="relative mt-4 mb-0.5 pl-4 text-[10.5pt] font-bold text-[#292723] before:absolute before:left-0 before:top-[0.55em] before:h-2 before:w-2 before:rounded-full before:bg-[#9b5d30]"
              {...elementProps(props)}
            >
              {props.children}
            </h3>
          ),
          h4: (props) => (
            <h4
              className="mb-1.5 pl-4 text-[8.7pt] font-semibold text-[#746e66]"
              {...elementProps(props)}
            >
              {props.children}
            </h4>
          ),
          p: (props) => (
            <p className="mb-2.5 text-[9.5pt] text-[#4f4b46]" {...elementProps(props)}>
              {props.children}
            </p>
          ),
          ul: (props) => (
            <ul
              className="mb-3 list-disc space-y-1 pl-[1.2em] text-[9.5pt] text-[#4f4b46] marker:text-[#9b5d30]"
              {...elementProps(props)}
            >
              {props.children}
            </ul>
          ),
          li: (props) => <li {...elementProps(props)}>{props.children}</li>,
          strong: (props) => (
            <strong className="font-bold text-[#292723]" {...elementProps(props)}>
              {props.children}
            </strong>
          ),
          a: (props) => (
            <a
              className="font-semibold underline underline-offset-2"
              style={{ color: 'var(--cv-accent, #9b5d30)' }}
              {...elementProps(props)}
            >
              {props.children}
            </a>
          ),
        }}
      >
        {bodyMarkdown}
      </ReactMarkdown>
    </div>
  );
};

export default TheAscentTemplate;
