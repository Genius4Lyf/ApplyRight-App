import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Globe, Linkedin, Mail, MapPin, Phone } from 'lucide-react';

const elementProps = (props) => {
  const clean = { ...props };
  delete clean.node;
  delete clean.children;
  return clean;
};

const OperationsBlueprintTemplate = ({ markdown, userProfile }) => {
  if (!markdown || typeof markdown !== 'string') return null;

  const markdownName = markdown.match(/^#\s+(.+)/m)?.[1]?.trim();
  const profileName =
    userProfile?.fullName ||
    [userProfile?.firstName, userProfile?.otherName, userProfile?.lastName]
      .filter(Boolean)
      .join(' ');
  const name =
    markdownName && !/your name|full name/i.test(markdownName)
      ? markdownName
      : profileName || 'Your Name';
  const roleTitle = userProfile?.currentJobTitle || '';
  const contactItems = [
    userProfile?.email && { icon: Mail, label: 'Email', value: userProfile.email },
    userProfile?.phone && { icon: Phone, label: 'Phone', value: userProfile.phone },
    userProfile?.location && { icon: MapPin, label: 'Base', value: userProfile.location },
    userProfile?.linkedinUrl && {
      icon: Linkedin,
      label: 'LinkedIn',
      value: userProfile.linkedinUrl.replace(/^https?:\/\/(www\.)?/, ''),
    },
    userProfile?.portfolioUrl && {
      icon: Globe,
      label: 'Portfolio',
      value: userProfile.portfolioUrl.replace(/^https?:\/\//, ''),
    },
  ].filter(Boolean);
  const bodyMarkdown = markdown.replace(/^#\s+.+$/m, '').trim();

  return (
    <div
      className="mx-auto bg-[#fbfaf7] text-[#2f363c]"
      style={{
        lineHeight: 'var(--cv-leading, 1.46)',
        fontFamily: "var(--cv-font, 'IBM Plex Sans', Arial, sans-serif)",
      }}
    >
      <header className="border-t-8 border-[#18232d]">
        <div className="grid grid-cols-[minmax(0,1fr)_285px]">
          <div className="relative overflow-hidden bg-[#18232d] px-9 py-6 text-white">
            <span
              aria-hidden="true"
              className="absolute bottom-0 right-0 h-10 w-10 border-b-[20px] border-r-[20px] border-b-[#ef8f22] border-r-[#ef8f22] border-l-[20px] border-l-transparent border-t-[20px] border-t-transparent opacity-95"
            />
            <h1 className="relative max-w-[94%] text-[25pt] font-extrabold uppercase leading-[0.96] tracking-[-0.035em] text-white">
              {name}
            </h1>
            {roleTitle && (
              <p className="relative mt-3 text-[9.5pt] font-semibold uppercase tracking-[0.15em] text-[#f3a74f]">
                {roleTitle}
              </p>
            )}
          </div>

          <div className="border-l-4 border-[#ef8f22] bg-[#f1f2ee] px-4 py-3">
            <div>
              {contactItems.map((item) => (
                <div
                  key={`${item.label}-${item.value}`}
                  className="grid min-w-0 grid-cols-[22px_52px_minmax(0,1fr)] items-center gap-2 border-b border-[#d5d8d3] py-1.5 last:border-b-0"
                >
                  <span className="grid h-[18px] w-[18px] place-items-center text-[#ef8f22]">
                    <item.icon size={9} strokeWidth={2.25} />
                  </span>
                  <span className="font-mono text-[6.3pt] font-bold uppercase tracking-[0.12em] text-[#7a8182]">
                    {item.label}
                  </span>
                  <span className="min-w-0 break-words text-[7.4pt] font-semibold leading-[1.22] text-[#273138]">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid h-1.5 grid-cols-[72%_28%]">
          <div className="bg-[#ef8f22]" />
          <div className="bg-[#9da5a8]" />
        </div>
      </header>

      <main style={{ padding: 'var(--cv-margin, 2.35rem 3rem 3rem)' }}>
        <ReactMarkdown
          components={{
            h1: () => null,
            h2: (props) => (
              <h2
                className="mt-6 mb-3 flex items-stretch border-y border-[#c9cdca] text-[9pt] font-bold uppercase tracking-[0.16em] text-[#18232d] first:mt-0"
                {...elementProps(props)}
              >
                <span aria-hidden="true" className="mr-3 w-1.5 shrink-0 bg-[#ef8f22]" />
                <span className="py-2">{props.children}</span>
              </h2>
            ),
            h3: (props) => (
              <h3
                className="mt-4 mb-0.5 text-[10.5pt] font-bold tracking-[-0.01em] text-[#18232d]"
                {...elementProps(props)}
              >
                {props.children}
              </h3>
            ),
            h4: (props) => (
              <h4
                className="mb-2 border-l-2 border-[#ef8f22] pl-2 text-[8.4pt] font-semibold uppercase tracking-[0.055em] text-[#697277]"
                {...elementProps(props)}
              >
                {props.children}
              </h4>
            ),
            p: (props) => (
              <p className="mb-2.5 text-[9.4pt] text-[#4d565b]" {...elementProps(props)}>
                {props.children}
              </p>
            ),
            ul: (props) => (
              <ul
                className="mb-3 list-[square] space-y-1.5 pl-[1.15em] text-[9.4pt] text-[#4d565b] marker:text-[#ef8f22]"
                {...elementProps(props)}
              >
                {props.children}
              </ul>
            ),
            li: (props) => <li {...elementProps(props)}>{props.children}</li>,
            strong: (props) => (
              <strong className="font-bold text-[#18232d]" {...elementProps(props)}>
                {props.children}
              </strong>
            ),
            a: (props) => (
              <a
                className="font-semibold text-[#18232d] underline decoration-[#ef8f22] underline-offset-2"
                {...elementProps(props)}
              >
                {props.children}
              </a>
            ),
            hr: (props) => <hr className="my-5 border-[#c9cdca]" {...elementProps(props)} />,
          }}
        >
          {bodyMarkdown}
        </ReactMarkdown>
      </main>
    </div>
  );
};

export default OperationsBlueprintTemplate;
