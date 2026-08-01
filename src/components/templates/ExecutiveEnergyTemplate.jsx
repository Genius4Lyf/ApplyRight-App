import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Globe, Linkedin, Mail, MapPin, Phone } from 'lucide-react';

const elementProps = (props) => {
  const clean = { ...props };
  delete clean.node;
  delete clean.children;
  return clean;
};

const ExecutiveEnergyTemplate = ({ markdown, userProfile }) => {
  if (!markdown || typeof markdown !== 'string') return null;

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
      className="mx-auto bg-white text-[#303840]"
      style={{
        lineHeight: 'var(--cv-leading, 1.48)',
        fontFamily: "var(--cv-font, 'IBM Plex Sans', sans-serif)",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');`}</style>

      <header className="relative overflow-hidden bg-[#202a33] px-10 py-8 text-white">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-2"
          style={{ background: '#d68a00' }}
        />
        <div
          aria-hidden="true"
          className="absolute right-0 top-0 h-3 w-[35%] opacity-90"
          style={{ background: '#d68a00' }}
        />

        <div className="relative flex items-start justify-between gap-9">
          <div className="min-w-0 flex-1">
            <h1 className="text-[27pt] font-bold uppercase leading-[0.98] tracking-[-0.025em] text-white">
              {name}
            </h1>
            {roleTitle && (
              <p
                className="mt-3 text-[10pt] font-semibold uppercase tracking-[0.12em]"
                style={{ color: '#f1aa2c' }}
              >
                {roleTitle}
              </p>
            )}
          </div>

          {userProfile?.photoUrl && (
            <img
              src={userProfile.photoUrl}
              alt=""
              className="h-[78px] w-[68px] shrink-0 border-2 border-white/30 object-cover grayscale"
            />
          )}
        </div>

        {contactItems.length > 0 && (
          <div className="relative mt-5 grid grid-cols-2 gap-x-8 gap-y-2 border-t border-white/20 pt-3 text-[8pt] text-white/75">
            {contactItems.map((item) => (
              <div key={item.value} className="flex min-w-0 items-center gap-2">
                <item.icon size={10} className="shrink-0" style={{ color: '#f1aa2c' }} />
                <span className="truncate">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </header>

      <main style={{ padding: 'var(--cv-margin, 2.4rem 3rem 3rem)' }}>
        <ReactMarkdown
          components={{
            h1: () => null,
            h2: (props) => (
              <h2
                className="mt-6 mb-3 flex items-center gap-3 text-[9pt] font-bold uppercase tracking-[0.16em] text-[#202a33] first:mt-0 after:h-px after:flex-1 after:bg-[#aeb6bc]"
                {...elementProps(props)}
              >
                <span
                  aria-hidden="true"
                  className="block h-3 w-1.5 shrink-0"
                  style={{ background: '#d68a00' }}
                />
                {props.children}
              </h2>
            ),
            h3: (props) => (
              <h3
                className="mt-4 mb-0.5 text-[10.5pt] font-bold text-[#202a33]"
                {...elementProps(props)}
              >
                {props.children}
              </h3>
            ),
            h4: (props) => (
              <h4
                className="mb-1.5 text-[8.6pt] font-semibold uppercase tracking-[0.045em] text-[#68737c]"
                {...elementProps(props)}
              >
                {props.children}
              </h4>
            ),
            p: (props) => (
              <p className="mb-2.5 text-[9.5pt] text-[#4b555d]" {...elementProps(props)}>
                {props.children}
              </p>
            ),
            ul: (props) => (
              <ul
                className="mb-3 list-square space-y-1 pl-[1.15em] text-[9.5pt] text-[#4b555d] marker:text-[#d68a00]"
                {...elementProps(props)}
              >
                {props.children}
              </ul>
            ),
            li: (props) => <li {...elementProps(props)}>{props.children}</li>,
            strong: (props) => (
              <strong className="font-bold text-[#202a33]" {...elementProps(props)}>
                {props.children}
              </strong>
            ),
            a: (props) => (
              <a
                className="font-semibold underline decoration-[#aeb6bc] underline-offset-2"
                {...elementProps(props)}
              >
                {props.children}
              </a>
            ),
            hr: (props) => <hr className="my-5 border-[#d8dde0]" {...elementProps(props)} />,
          }}
        >
          {bodyMarkdown}
        </ReactMarkdown>
      </main>
    </div>
  );
};

export default ExecutiveEnergyTemplate;
