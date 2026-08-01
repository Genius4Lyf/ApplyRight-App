import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Globe, Linkedin, Mail, MapPin, Phone } from 'lucide-react';

const elementProps = (props) => {
  const clean = { ...props };
  delete clean.node;
  delete clean.children;
  return clean;
};

const ModernCleanTemplate = ({ markdown, userProfile }) => {
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
      className="mx-auto bg-white text-[#24313b]"
      style={{
        lineHeight: 'var(--cv-leading, 1.5)',
        fontFamily: "var(--cv-font, 'Manrope', sans-serif)",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');`}</style>
      <div className="h-2" style={{ background: 'var(--cv-accent, #0f766e)' }} />

      <header className="px-10 pt-8 pb-0">
        <div className="flex items-end justify-between gap-8">
          <div className="min-w-0">
            <h1 className="text-[27pt] font-extrabold leading-none tracking-[-0.045em] text-[#16232c]">
              {name}
            </h1>
            {roleTitle && (
              <p
                className="mt-2 text-[10pt] font-semibold uppercase tracking-[0.14em]"
                style={{ color: 'var(--cv-accent, #0f766e)' }}
              >
                {roleTitle}
              </p>
            )}
          </div>
          {userProfile?.photoUrl && (
            <img
              src={userProfile.photoUrl}
              alt=""
              className="h-[68px] w-[68px] shrink-0 rounded-lg object-cover"
            />
          )}
        </div>

        {contactItems.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-x-7 gap-y-2 border-y border-[#dce3e5] bg-[#f4f7f7] px-4 py-3 text-[8.3pt] text-[#53616a]">
            {contactItems.map((item) => (
              <div key={item.value} className="flex items-center gap-2 min-w-0">
                <item.icon
                  size={10}
                  className="shrink-0"
                  style={{ color: 'var(--cv-accent, #0f766e)' }}
                />
                <span className="truncate">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </header>

      <main className="px-10 pt-5 pb-10">
        <ReactMarkdown
          components={{
            h1: () => null,
            h2: (props) => (
              <h2
                className="mt-6 mb-3 border-b-2 pb-1.5 text-[9pt] font-extrabold uppercase tracking-[0.17em] text-[#22313a] first:mt-0"
                style={{ borderColor: 'var(--cv-accent, #0f766e)' }}
                {...elementProps(props)}
              >
                {props.children}
              </h2>
            ),
            h3: (props) => (
              <h3
                className="mt-4 mb-0.5 text-[10.5pt] font-bold text-[#17242d]"
                {...elementProps(props)}
              >
                {props.children}
              </h3>
            ),
            h4: (props) => (
              <h4
                className="mb-1.5 text-[8.7pt] font-semibold text-[#69757c]"
                {...elementProps(props)}
              >
                {props.children}
              </h4>
            ),
            p: (props) => (
              <p className="mb-2.5 text-[9.4pt] text-[#4c5961]" {...elementProps(props)}>
                {props.children}
              </p>
            ),
            ul: (props) => (
              <ul
                className="mb-3 list-disc space-y-1 pl-[1.15em] text-[9.4pt] text-[#4c5961] marker:text-[#0f766e]"
                {...elementProps(props)}
              >
                {props.children}
              </ul>
            ),
            li: (props) => <li {...elementProps(props)}>{props.children}</li>,
            strong: (props) => (
              <strong className="font-bold text-[#17242d]" {...elementProps(props)}>
                {props.children}
              </strong>
            ),
            a: (props) => (
              <a
                className="font-semibold underline underline-offset-2"
                style={{ color: 'var(--cv-accent, #0f766e)' }}
                {...elementProps(props)}
              >
                {props.children}
              </a>
            ),
            hr: (props) => <hr className="my-5 border-[#dce3e5]" {...elementProps(props)} />,
          }}
        >
          {bodyMarkdown}
        </ReactMarkdown>
      </main>
    </div>
  );
};

export default ModernCleanTemplate;
