import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Globe, Linkedin, Mail, MapPin, Phone } from 'lucide-react';

const elementProps = (props) => {
  const clean = { ...props };
  delete clean.node;
  delete clean.children;
  return clean;
};

const ExecutiveCorporateTemplate = ({ markdown, userProfile }) => {
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
      className="mx-auto bg-white text-[#29313a]"
      style={{
        lineHeight: 'var(--cv-leading, 1.45)',
        fontFamily: "var(--cv-font, 'Inter', sans-serif)",
        padding: 'var(--cv-margin, 2.6rem 3rem)',
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>

      <header className="mb-7">
        <div className="flex items-start justify-between gap-10">
          <div className="min-w-0 flex-1">
            <h1 className="text-[28pt] font-extrabold uppercase leading-[0.98] tracking-[-0.04em] text-[#1e2935]">
              {name}
            </h1>
            {roleTitle && (
              <p className="mt-2 text-[9.5pt] font-semibold uppercase tracking-[0.16em] text-[#596673]">
                {roleTitle}
              </p>
            )}
          </div>

          {contactItems.length > 0 && (
            <div className="w-[39%] shrink-0 border-l border-[#cbd1d6] pl-5 text-[8pt] text-[#596673]">
              {contactItems.map((item) => (
                <div key={item.value} className="mb-1.5 flex items-start gap-2 last:mb-0">
                  <item.icon size={10} className="mt-0.5 shrink-0" />
                  <span className="break-all">{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      <ReactMarkdown
        components={{
          h1: () => null,
          h2: (props) => (
            <h2
              className="mt-6 mb-3 flex items-center gap-3 text-[9.3pt] font-extrabold uppercase tracking-[0.12em] text-[#1e2935] first:mt-0 after:h-[2px] after:flex-1 after:bg-[#25364a]"
              {...elementProps(props)}
            >
              {props.children}
            </h2>
          ),
          h3: (props) => (
            <h3
              className="mt-4 mb-0.5 text-[10.3pt] font-bold text-[#202a34]"
              {...elementProps(props)}
            >
              {props.children}
            </h3>
          ),
          h4: (props) => (
            <h4
              className="mb-1.5 text-[8.5pt] font-semibold uppercase tracking-[0.04em] text-[#66727d]"
              {...elementProps(props)}
            >
              {props.children}
            </h4>
          ),
          p: (props) => (
            <p className="mb-2.5 text-[9.3pt] text-[#46515b]" {...elementProps(props)}>
              {props.children}
            </p>
          ),
          ul: (props) => (
            <ul
              className="mb-3 list-disc space-y-1 pl-[1.15em] text-[9.3pt] text-[#46515b] marker:text-[#25364a]"
              {...elementProps(props)}
            >
              {props.children}
            </ul>
          ),
          li: (props) => <li {...elementProps(props)}>{props.children}</li>,
          strong: (props) => (
            <strong className="font-bold text-[#202a34]" {...elementProps(props)}>
              {props.children}
            </strong>
          ),
          a: (props) => (
            <a
              className="font-semibold underline decoration-[#9aa3ab] underline-offset-2"
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

export default ExecutiveCorporateTemplate;
