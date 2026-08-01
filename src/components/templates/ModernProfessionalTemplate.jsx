import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Globe, Linkedin, Mail, MapPin, Phone } from 'lucide-react';

const elementProps = (props) => {
  const clean = { ...props };
  delete clean.node;
  delete clean.children;
  return clean;
};

const ModernProfessionalTemplate = ({ markdown, userProfile }) => {
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
      className="mx-auto bg-[#f7f6f2] text-[#25282d]"
      style={{
        lineHeight: 'var(--cv-leading, 1.52)',
        fontFamily: "var(--cv-font, 'Inter', sans-serif)",
        padding: 'var(--cv-margin, 2.7rem 3rem)',
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>

      <header className="mb-7 border-b border-[#c9c6bd] pb-6">
        <div className="flex items-start justify-between gap-8">
          <div
            className="min-w-0 border-l-[5px] pl-5"
            style={{ borderColor: 'var(--cv-accent, #9a6b3f)' }}
          >
            <h1 className="text-[25pt] font-semibold leading-[1.02] tracking-[-0.035em] text-[#202329]">
              {name}
            </h1>
            {roleTitle && (
              <p className="mt-2 text-[10.5pt] font-medium tracking-[0.04em] text-[#555961]">
                {roleTitle}
              </p>
            )}
          </div>

          {userProfile?.photoUrl && (
            <img
              src={userProfile.photoUrl}
              alt=""
              className="h-[74px] w-[74px] shrink-0 object-cover grayscale"
            />
          )}
        </div>

        {contactItems.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[8.3pt] text-[#61646a]">
            {contactItems.map((item) => (
              <div key={item.value} className="flex items-center gap-1.5">
                <item.icon size={10} style={{ color: 'var(--cv-accent, #9a6b3f)' }} />
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
              className="mt-6 mb-3 flex items-center gap-3 text-[8.8pt] font-bold uppercase tracking-[0.2em] text-[#34373c] first:mt-0 after:h-px after:flex-1 after:bg-[#cbc8c0]"
              {...elementProps(props)}
            >
              {props.children}
            </h2>
          ),
          h3: (props) => (
            <h3
              className="mt-4 mb-0.5 text-[10.5pt] font-semibold text-[#202329]"
              {...elementProps(props)}
            >
              {props.children}
            </h3>
          ),
          h4: (props) => (
            <h4 className="mb-1.5 text-[8.8pt] font-medium text-[#6b6e73]" {...elementProps(props)}>
              {props.children}
            </h4>
          ),
          p: (props) => (
            <p className="mb-2.5 text-[9.5pt] text-[#45484e]" {...elementProps(props)}>
              {props.children}
            </p>
          ),
          ul: (props) => (
            <ul
              className="mb-3 list-disc space-y-1 pl-[1.15em] text-[9.5pt] text-[#45484e] marker:text-[#9a6b3f]"
              {...elementProps(props)}
            >
              {props.children}
            </ul>
          ),
          li: (props) => <li {...elementProps(props)}>{props.children}</li>,
          strong: (props) => (
            <strong className="font-semibold text-[#202329]" {...elementProps(props)}>
              {props.children}
            </strong>
          ),
          a: (props) => (
            <a
              className="underline decoration-[#aaa69d] underline-offset-2"
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

export default ModernProfessionalTemplate;
