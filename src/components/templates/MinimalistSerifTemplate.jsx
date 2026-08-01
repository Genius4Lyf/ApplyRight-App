import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Globe, Linkedin, Mail, MapPin, Phone } from 'lucide-react';

const elementProps = (props) => {
  const clean = { ...props };
  delete clean.node;
  delete clean.children;
  return clean;
};

const MinimalistSerifTemplate = ({ markdown, userProfile }) => {
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
      className="mx-auto bg-[#fcfbf7] text-[#292724]"
      style={{
        lineHeight: 'var(--cv-leading, 1.52)',
        fontFamily: "var(--cv-font, 'Source Sans 3', sans-serif)",
        padding: 'var(--cv-margin, 2.8rem 3.1rem)',
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Source+Sans+3:wght@400;500;600;700&display=swap');`}</style>

      <header className="mb-7 pb-5">
        <div className="flex items-start justify-between gap-8">
          <div className="min-w-0 flex-1">
            <h1
              className="text-[29pt] leading-[0.98] tracking-[-0.025em] text-[#211f1c]"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              {name}
            </h1>
            {roleTitle && (
              <p className="mt-2 text-[10pt] font-medium italic text-[#625d56]">{roleTitle}</p>
            )}
          </div>

          {userProfile?.photoUrl && (
            <img
              src={userProfile.photoUrl}
              alt=""
              className="h-[76px] w-[64px] shrink-0 border border-[#bdb6aa] object-cover grayscale"
            />
          )}
        </div>

        {contactItems.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1.5 text-[8pt] text-[#6b665f]">
            {contactItems.map((item) => (
              <div key={item.value} className="flex min-w-0 items-center gap-2">
                <item.icon
                  size={10}
                  className="shrink-0"
                  style={{ color: 'var(--cv-accent, #7b3f35)' }}
                />
                <span className="truncate">{item.value}</span>
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
              className="mt-6 mb-3 flex items-baseline gap-3 text-[13pt] text-[#26231f] first:mt-0 after:h-px after:flex-1 after:bg-[#c9c2b7]"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              {...elementProps(props)}
            >
              <span
                aria-hidden="true"
                className="text-[8pt] font-sans font-semibold tracking-[0.12em]"
                style={{ color: 'var(--cv-accent, #7b3f35)' }}
              >
                §
              </span>
              {props.children}
            </h2>
          ),
          h3: (props) => (
            <h3
              className="mt-4 mb-0.5 text-[11pt] text-[#292622]"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              {...elementProps(props)}
            >
              {props.children}
            </h3>
          ),
          h4: (props) => (
            <h4
              className="mb-1.5 text-[8.4pt] font-semibold uppercase tracking-[0.07em] text-[#746e66]"
              {...elementProps(props)}
            >
              {props.children}
            </h4>
          ),
          p: (props) => (
            <p className="mb-2.5 text-[9.5pt] text-[#4d4943]" {...elementProps(props)}>
              {props.children}
            </p>
          ),
          ul: (props) => (
            <ul
              className="mb-3 list-disc space-y-1 pl-[1.15em] text-[9.5pt] text-[#4d4943] marker:text-[#7b3f35]"
              {...elementProps(props)}
            >
              {props.children}
            </ul>
          ),
          li: (props) => <li {...elementProps(props)}>{props.children}</li>,
          strong: (props) => (
            <strong className="font-semibold text-[#292622]" {...elementProps(props)}>
              {props.children}
            </strong>
          ),
          a: (props) => (
            <a
              className="font-medium underline decoration-[#aaa297] underline-offset-2"
              style={{ color: 'var(--cv-accent, #7b3f35)' }}
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

export default MinimalistSerifTemplate;
