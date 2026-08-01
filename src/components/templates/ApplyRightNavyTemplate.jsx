import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Globe, Linkedin, Mail, MapPin, Phone } from 'lucide-react';
import { CV_LABELS } from '../../lib/cvLabels';

const headingForms = (canonicalKey) => {
  const entry = CV_LABELS[canonicalKey];
  const forms = entry ? Array.from(new Set(Object.values(entry).filter(Boolean))) : [canonicalKey];
  return forms.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
};

const elementProps = (props) => {
  const clean = { ...props };
  delete clean.node;
  delete clean.children;
  return clean;
};

const ApplyRightNavyTemplate = ({ markdown, userProfile }) => {
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
  const bodyMarkdown = markdown.replace(/^#\s+.+$/m, '').trim();
  const skillsPattern = new RegExp(
    `^##\\s+(?:${headingForms('skills')})\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|(?![\\s\\S]))`,
    'm'
  );
  const skillsRaw = bodyMarkdown.match(skillsPattern)?.[1]?.trim() || '';
  const languageMatch = skillsRaw.match(/^-\s+\*\*Languages:\*\*\s*(.+)$/m);
  const languagesLine = languageMatch?.[1]?.trim() || '';
  const skillsMarkdown = languageMatch ? skillsRaw.replace(languageMatch[0], '').trim() : skillsRaw;
  const mainMarkdown = bodyMarkdown.replace(skillsPattern, '').trim();

  return (
    <div
      className="mx-auto flex bg-white text-[#111827]"
      style={{
        lineHeight: 'var(--cv-leading, 1.45)',
        fontFamily: "var(--cv-font, 'Inter', system-ui, sans-serif)",
      }}
    >
      <aside data-cv-sidebar className="w-[34%] shrink-0 bg-[#0c1627] px-7 py-8 text-white">
        <div className="relative mx-auto mb-8 h-28 w-28 rounded-full border border-white/25 p-2">
          {userProfile?.photoUrl ? (
            <img
              src={userProfile.photoUrl}
              alt=""
              className="h-full w-full rounded-full object-cover grayscale"
            />
          ) : (
            <div className="grid h-full w-full place-items-center rounded-full bg-white text-[21pt] font-bold tracking-[0.1em] text-[#0c1627]">
              {initials}
            </div>
          )}
          <span
            aria-hidden="true"
            className="absolute right-[4px] top-[7px] h-3.5 w-3.5 rounded-full border-2 border-[#0c1627] bg-white"
          />
        </div>

        {contactItems.length > 0 && (
          <section className="mb-7">
            <h2 className="mb-3 text-[8.3pt] font-bold uppercase tracking-[0.2em] text-white/45">
              Details
            </h2>
            <div className="space-y-2.5 text-[8.8pt] text-white/80">
              {contactItems.map((item) => (
                <div key={item.value} className="flex items-start gap-2 break-all">
                  <item.icon size={10} className="mt-0.5 shrink-0 text-white/45" />
                  <span>{item.value}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {skillsMarkdown && (
          <section className="mb-7 border-t border-white/15 pt-5">
            <h2 className="mb-3 text-[8.3pt] font-bold uppercase tracking-[0.2em] text-white/45">
              Skills
            </h2>
            <ReactMarkdown
              components={{
                p: (props) => (
                  <p className="mb-2 text-[8.8pt] text-white/80" {...elementProps(props)}>
                    {props.children}
                  </p>
                ),
                ul: (props) => (
                  <ul className="space-y-1.5 text-[8.8pt] text-white/80" {...elementProps(props)}>
                    {props.children}
                  </ul>
                ),
                li: (props) => <li {...elementProps(props)}>{props.children}</li>,
                strong: (props) => (
                  <strong className="font-semibold text-white" {...elementProps(props)}>
                    {props.children}
                  </strong>
                ),
              }}
            >
              {skillsMarkdown}
            </ReactMarkdown>
          </section>
        )}

        {languagesLine && (
          <section className="border-t border-white/15 pt-5">
            <h2 className="mb-3 text-[8.3pt] font-bold uppercase tracking-[0.2em] text-white/45">
              Languages
            </h2>
            <p className="text-[8.8pt] text-white/80">{languagesLine}</p>
          </section>
        )}
      </aside>

      <main className="w-[66%]" style={{ padding: 'var(--cv-margin, 2.6rem)' }}>
        <header className="relative mb-8 pr-10">
          <div
            aria-hidden="true"
            className="absolute right-0 top-0 h-8 w-8 rounded-full border border-[#0c1627]/25"
          >
            <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0c1627]" />
            <span className="absolute right-[1px] top-[2px] h-1.5 w-1.5 rounded-full bg-[#0c1627]" />
          </div>
          <h1 className="text-[27pt] font-extrabold leading-[0.98] tracking-[-0.045em] text-[#0c1627]">
            {name}
          </h1>
          {roleTitle && (
            <p className="mt-3 text-[9.5pt] font-semibold uppercase tracking-[0.14em] text-[#657080]">
              {roleTitle}
            </p>
          )}
        </header>

        <ReactMarkdown
          components={{
            h1: () => null,
            h2: (props) => (
              <h2
                className="mt-6 mb-3 border-l-[4px] border-[#0c1627] pl-3 text-[9pt] font-bold uppercase tracking-[0.16em] text-[#0c1627] first:mt-0"
                {...elementProps(props)}
              >
                {props.children}
              </h2>
            ),
            h3: (props) => (
              <h3
                className="mt-4 mb-0.5 text-[10.5pt] font-bold text-[#111827]"
                {...elementProps(props)}
              >
                {props.children}
              </h3>
            ),
            h4: (props) => (
              <h4
                className="mb-1.5 text-[8.6pt] font-medium text-[#687383]"
                {...elementProps(props)}
              >
                {props.children}
              </h4>
            ),
            p: (props) => (
              <p className="mb-2.5 text-[9.5pt] text-[#46515f]" {...elementProps(props)}>
                {props.children}
              </p>
            ),
            ul: (props) => (
              <ul
                className="mb-3 list-disc space-y-1 pl-[1.15em] text-[9.5pt] text-[#46515f] marker:text-[#0c1627]"
                {...elementProps(props)}
              >
                {props.children}
              </ul>
            ),
            li: (props) => <li {...elementProps(props)}>{props.children}</li>,
            strong: (props) => (
              <strong className="font-bold text-[#111827]" {...elementProps(props)}>
                {props.children}
              </strong>
            ),
            a: (props) => (
              <a
                className="font-medium underline decoration-[#a9b0ba] underline-offset-2"
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

export default ApplyRightNavyTemplate;
