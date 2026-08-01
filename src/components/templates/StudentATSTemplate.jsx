import React from 'react';
import ReactMarkdown from 'react-markdown';

const elementProps = (props) => {
  const clean = { ...props };
  delete clean.node;
  delete clean.children;
  return clean;
};

const StudentATSTemplate = ({ markdown, userProfile }) => {
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
    userProfile?.email,
    userProfile?.phone,
    userProfile?.location,
    userProfile?.linkedinUrl?.replace(/^https?:\/\/(www\.)?/, ''),
    userProfile?.portfolioUrl?.replace(/^https?:\/\//, ''),
  ].filter(Boolean);
  const bodyMarkdown = markdown.replace(/^#\s+.+$/m, '').trim();

  return (
    <div
      className="mx-auto bg-white text-[#26313d]"
      style={{
        lineHeight: 'var(--cv-leading, 1.5)',
        fontFamily: "var(--cv-font, Arial, 'Helvetica Neue', sans-serif)",
        padding: 'var(--cv-margin, 2.7rem 3rem)',
      }}
    >
      <header className="mb-7">
        <h1 className="text-[25pt] font-bold leading-none tracking-[-0.03em] text-[#1d2c3d]">
          {name}
        </h1>
        {roleTitle && (
          <p
            className="mt-2 text-[9.5pt] font-semibold uppercase tracking-[0.11em]"
            style={{ color: 'var(--cv-accent, #34495e)' }}
          >
            {roleTitle}
          </p>
        )}
        {contactItems.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-[8.5pt] text-[#617080]">
            {contactItems.map((item, index) => (
              <React.Fragment key={item}>
                <span>{item}</span>
                {index < contactItems.length - 1 && (
                  <span aria-hidden="true" className="text-[#a7b0b9]">
                    •
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </header>

      <ReactMarkdown
        components={{
          h1: () => null,
          h2: (props) => (
            <h2
              className="mt-6 mb-3 border-b pb-1.5 text-[10pt] font-bold uppercase tracking-[0.11em] first:mt-0"
              style={{
                color: 'var(--cv-accent, #34495e)',
                borderColor: 'var(--cv-accent, #34495e)',
              }}
              {...elementProps(props)}
            >
              {props.children}
            </h2>
          ),
          h3: (props) => (
            <h3
              className="mt-4 mb-0.5 text-[10.5pt] font-bold text-[#26313d]"
              {...elementProps(props)}
            >
              {props.children}
            </h3>
          ),
          h4: (props) => (
            <h4
              className="mb-1.5 text-[8.7pt] font-semibold text-[#657382]"
              {...elementProps(props)}
            >
              {props.children}
            </h4>
          ),
          p: (props) => (
            <p className="mb-2.5 text-[9.5pt] text-[#465461]" {...elementProps(props)}>
              {props.children}
            </p>
          ),
          ul: (props) => (
            <ul
              className="mb-3 list-disc space-y-1 pl-[1.15em] text-[9.5pt] text-[#465461]"
              {...elementProps(props)}
            >
              {props.children}
            </ul>
          ),
          li: (props) => <li {...elementProps(props)}>{props.children}</li>,
          strong: (props) => (
            <strong className="font-bold text-[#26313d]" {...elementProps(props)}>
              {props.children}
            </strong>
          ),
          a: (props) => (
            <a
              className="font-medium underline decoration-[#a7b0b9] underline-offset-2"
              style={{ color: 'var(--cv-accent, #34495e)' }}
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

export default StudentATSTemplate;
