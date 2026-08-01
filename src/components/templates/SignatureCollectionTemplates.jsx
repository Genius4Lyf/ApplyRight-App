import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Globe, Linkedin, Mail, MapPin, Phone } from 'lucide-react';
import { CV_LABELS } from '../../lib/cvLabels';

const headingForms = (canonicalKey) => {
  const entry = CV_LABELS[canonicalKey];
  const forms = entry ? Array.from(new Set(Object.values(entry).filter(Boolean))) : [canonicalKey];
  return forms.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
};

const sectionPattern = (canonicalKey) =>
  new RegExp(
    `^##\\s+(?:${headingForms(canonicalKey)})\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|(?![\\s\\S]))`,
    'm'
  );

const extractSection = (markdown, key) => markdown.match(sectionPattern(key))?.[1]?.trim() || '';

const removeSections = (markdown, keys) =>
  keys.reduce((current, key) => current.replace(sectionPattern(key), ''), markdown).trim();

const getName = (markdown, userProfile) => {
  const markdownName = markdown.match(/^#\s+(.+)/m)?.[1]?.trim();
  if (markdownName && !/your name|full name/i.test(markdownName)) return markdownName;
  if (userProfile?.fullName) return userProfile.fullName;
  const profileName = [userProfile?.firstName, userProfile?.otherName, userProfile?.lastName]
    .filter(Boolean)
    .join(' ');
  return profileName || 'Your Name';
};

const getInitials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const getContactItems = (userProfile) =>
  [
    userProfile?.phone && { icon: Phone, value: userProfile.phone },
    userProfile?.email && { icon: Mail, value: userProfile.email },
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

const elementProps = (props) => {
  const clean = { ...props };
  delete clean.node;
  delete clean.children;
  return clean;
};

const SectionMarkdown = ({ children, inverse = false, compact = false, timeline = false }) => (
  <ReactMarkdown
    components={{
      h1: () => null,
      h2: (props) => (
        <h2
          className={`${compact ? 'text-[9pt]' : 'text-[11pt]'} mt-5 mb-2 font-bold uppercase tracking-[0.07em] pb-1 ${
            timeline ? 'border-0' : 'border-b'
          } ${
            inverse ? 'text-white border-white/45' : 'text-[#333943] border-[#8f98a3]'
          } first:mt-0`}
          {...elementProps(props)}
        >
          {props.children}
        </h2>
      ),
      h3: (props) => (
        <h3
          className={`${compact ? 'text-[9pt]' : 'text-[10.5pt]'} mt-3 mb-0.5 font-bold ${
            timeline
              ? 'relative before:absolute before:-left-[29px] before:top-[0.4em] before:h-2 before:w-2 before:rounded-full before:bg-[#343d4d] before:ring-4 before:ring-white'
              : ''
          } ${inverse ? 'text-white' : 'text-[#303640]'}`}
          {...elementProps(props)}
        >
          {props.children}
        </h3>
      ),
      h4: (props) => (
        <h4
          className={`${compact ? 'text-[8.2pt]' : 'text-[9.2pt]'} mb-1.5 ${
            inverse ? 'text-white/75' : 'text-[#707780]'
          }`}
          {...elementProps(props)}
        >
          {props.children}
        </h4>
      ),
      p: (props) => (
        <p className={`${compact ? 'text-[8.5pt]' : 'text-[9.6pt]'} mb-2`} {...elementProps(props)}>
          {props.children}
        </p>
      ),
      ul: (props) => (
        <ul
          className={`${compact ? 'text-[8.5pt]' : 'text-[9.6pt]'} list-disc pl-[1.2em] mb-2`}
          {...elementProps(props)}
        >
          {props.children}
        </ul>
      ),
      li: (props) => (
        <li className="mb-0.5" {...elementProps(props)}>
          {props.children}
        </li>
      ),
      strong: (props) => (
        <strong className="font-bold" {...elementProps(props)}>
          {props.children}
        </strong>
      ),
      a: (props) => (
        <a className="underline" {...elementProps(props)}>
          {props.children}
        </a>
      ),
    }}
  >
    {children}
  </ReactMarkdown>
);

const ContactList = ({ items, inverse = false }) => (
  <div className={`space-y-2 text-[8.6pt] ${inverse ? 'text-white/90' : 'text-[#515861]'}`}>
    {items.map((item) => (
      <div key={item.value} className="flex items-start gap-2 break-all">
        <item.icon size={11} className="mt-0.5 shrink-0 opacity-80" />
        <span>{item.value}</span>
      </div>
    ))}
  </div>
);

const prepareTemplate = (markdown, userProfile) => {
  const safeMarkdown = typeof markdown === 'string' ? markdown : '';
  const body = safeMarkdown.replace(/^#\s+.+$/m, '').trim();
  return {
    body,
    name: getName(safeMarkdown, userProfile),
    initials: getInitials(getName(safeMarkdown, userProfile)),
    roleTitle: userProfile?.currentJobTitle || '',
    contactItems: getContactItems(userProfile),
    education: extractSection(body, 'education'),
    skills: extractSection(body, 'skills'),
    mainWithoutSidebar: removeSections(body, ['education', 'skills']),
  };
};

export const SlateTimelineTemplate = ({ markdown, userProfile }) => {
  const { name, initials, roleTitle, contactItems, education, skills, mainWithoutSidebar } =
    prepareTemplate(markdown, userProfile);

  return (
    <div
      className="bg-white mx-auto flex text-[#353b46]"
      style={{
        lineHeight: 'var(--cv-leading, 1.45)',
        fontFamily: "var(--cv-font, 'Inter', system-ui, sans-serif)",
      }}
    >
      <aside data-cv-sidebar className="w-[35%] shrink-0 bg-[#343d4d] px-7 py-8 text-white">
        {userProfile?.photoUrl && (
          <img
            src={userProfile.photoUrl}
            alt=""
            className="mb-7 h-24 w-24 rounded-full border-2 border-white/30 object-cover"
          />
        )}
        {!userProfile?.photoUrl && (
          <div className="mb-7 grid h-24 w-24 place-items-center rounded-full border-2 border-white/30 bg-white/10 text-[19pt] font-semibold tracking-[0.08em] text-white">
            {initials}
          </div>
        )}
        {contactItems.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 border-b border-white/45 pb-1 text-[12pt] font-bold text-white">
              Contact
            </h2>
            <ContactList items={contactItems} inverse />
          </section>
        )}
        {education && (
          <section className="mb-6">
            <h2 className="mb-2 border-b border-white/45 pb-1 text-[12pt] font-bold text-white">
              Education
            </h2>
            <SectionMarkdown inverse compact>
              {education}
            </SectionMarkdown>
          </section>
        )}
        {skills && (
          <section>
            <h2 className="mb-2 border-b border-white/45 pb-1 text-[12pt] font-bold text-white">
              Expertise
            </h2>
            <SectionMarkdown inverse compact>
              {skills}
            </SectionMarkdown>
          </section>
        )}
      </aside>

      <main className="w-[65%] px-8 py-9">
        <header className="mb-7 border-b-2 border-[#343d4d] pb-5">
          <h1 className="text-[27pt] font-extrabold leading-[1.02] tracking-[-0.03em] text-[#343d4d]">
            {name}
          </h1>
          {roleTitle && (
            <p className="mt-2 text-[10pt] font-semibold uppercase tracking-[0.14em] text-[#66707d]">
              {roleTitle}
            </p>
          )}
        </header>
        <div className="border-l-2 border-[#c7cbd1] pl-6">
          <SectionMarkdown timeline>{mainWithoutSidebar}</SectionMarkdown>
        </div>
      </main>
    </div>
  );
};

export const NavyPortraitTemplate = ({ markdown, userProfile }) => {
  const { name, initials, roleTitle, contactItems, education, skills, mainWithoutSidebar } =
    prepareTemplate(markdown, userProfile);

  return (
    <div
      className="bg-white mx-auto flex text-[#282b2e]"
      style={{
        lineHeight: 'var(--cv-leading, 1.43)',
        fontFamily: "var(--cv-font, 'Inter', system-ui, sans-serif)",
      }}
    >
      <aside data-cv-sidebar className="w-[36%] shrink-0 bg-[#193e57] px-7 py-8 text-white">
        {userProfile?.photoUrl && (
          <img
            src={userProfile.photoUrl}
            alt=""
            className="mx-auto mb-7 h-28 w-28 rounded-full border-[3px] border-[#d8c29d] object-cover"
          />
        )}
        {!userProfile?.photoUrl && (
          <div className="mx-auto mb-7 grid h-28 w-28 place-items-center rounded-full border-[3px] border-[#d8c29d] bg-white/10 text-[21pt] font-bold tracking-[0.08em] text-white">
            {initials}
          </div>
        )}
        <h2 className="mb-3 border-b border-[#d8c29d]/55 pb-2 text-[9pt] font-bold uppercase tracking-[0.2em] text-[#d8c29d]">
          Contact
        </h2>
        <div className="[&_svg]:text-[#d8c29d]">
          <ContactList items={contactItems} inverse />
        </div>
        {education && (
          <section className="mt-8">
            <h2 className="mb-2 border-b border-[#d8c29d]/55 pb-2 text-[9pt] font-bold uppercase tracking-[0.2em] text-[#d8c29d]">
              Education
            </h2>
            <SectionMarkdown inverse compact>
              {education}
            </SectionMarkdown>
          </section>
        )}
        {skills && (
          <section className="mt-8">
            <h2 className="mb-2 border-b border-[#d8c29d]/55 pb-2 text-[9pt] font-bold uppercase tracking-[0.2em] text-[#d8c29d]">
              Skills
            </h2>
            <SectionMarkdown inverse compact>
              {skills}
            </SectionMarkdown>
          </section>
        )}
      </aside>

      <main className="w-[64%] px-9 py-9">
        <header className="mb-8 border-b border-[#193e57] pb-6">
          <h1 className="max-w-[95%] text-[29pt] font-extrabold uppercase leading-[0.98] tracking-[-0.025em] text-[#172d3d]">
            {name}
          </h1>
          {roleTitle && (
            <p className="mt-3 text-[11pt] font-semibold uppercase tracking-[0.12em] text-[#526675]">
              {roleTitle}
            </p>
          )}
        </header>
        <SectionMarkdown>{mainWithoutSidebar}</SectionMarkdown>
      </main>
    </div>
  );
};

export const AngularCorporateTemplate = ({ markdown, userProfile }) => {
  const { body, name, roleTitle, contactItems } = prepareTemplate(markdown, userProfile);

  return (
    <div
      className="bg-white mx-auto text-[#292929]"
      style={{
        lineHeight: 'var(--cv-leading, 1.4)',
        fontFamily: "var(--cv-font, 'Inter', system-ui, sans-serif)",
      }}
    >
      <header className="relative overflow-hidden bg-[#314a60] px-10 py-8 text-white">
        <div className="absolute inset-0 bg-[#294157] [clip-path:polygon(0_0,100%_0,100%_100%,0_42%)]" />
        <div className="relative">
          <h1 className="text-[24pt] font-semibold uppercase tracking-[0.03em] text-[#efd4a8]">
            {name}
          </h1>
          {roleTitle && <p className="mt-1 text-[11pt] font-semibold">{roleTitle}</p>}
          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-[8.5pt]">
            {contactItems.map((item) => (
              <div key={item.value} className="flex items-center gap-2">
                <item.icon size={11} className="text-[#efd4a8]" />
                <span>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </header>
      <main className="px-10 py-6">
        <SectionMarkdown>{body}</SectionMarkdown>
      </main>
    </div>
  );
};

export const SalesSidebarTemplate = ({ markdown, userProfile }) => {
  const { name, initials, roleTitle, contactItems, education, skills, mainWithoutSidebar } =
    prepareTemplate(markdown, userProfile);

  return (
    <div
      className="bg-white mx-auto text-[#4c5158]"
      style={{
        lineHeight: 'var(--cv-leading, 1.45)',
        fontFamily: "var(--cv-font, 'Inter', system-ui, sans-serif)",
      }}
    >
      <header className="relative flex min-h-40 items-center pl-[38%] pr-9">
        <div className="absolute inset-y-5 left-[29%] right-0 bg-[#d5dfe7] [clip-path:polygon(7%_0,100%_0,100%_100%,7%_100%,0_50%)]" />
        {userProfile?.photoUrl && (
          <img
            src={userProfile.photoUrl}
            alt=""
            className="absolute left-12 top-5 z-10 h-32 w-32 rounded-full border-4 border-white object-cover"
          />
        )}
        {!userProfile?.photoUrl && (
          <div className="absolute left-12 top-5 z-10 grid h-32 w-32 place-items-center rounded-full border-4 border-white bg-[#eef2f5] text-[24pt] font-semibold tracking-[0.08em] text-[#4c5158]">
            {initials}
          </div>
        )}
        <div className="relative z-10">
          <h1 className="text-[24pt] font-medium uppercase tracking-[0.11em]">{name}</h1>
          {roleTitle && (
            <p className="mt-1 text-[13pt] font-medium tracking-[0.04em]">{roleTitle}</p>
          )}
        </div>
      </header>

      <div className="flex items-stretch">
        <aside
          data-cv-sidebar
          className="ml-0 w-[38%] shrink-0 rounded-tr-[42px] bg-[#d5dfe7] px-7 py-8"
        >
          <ContactList items={contactItems} />
          {education && (
            <section className="mt-8">
              <h2 className="mb-2 border-b border-[#747b82] pb-1 text-[12pt] font-medium uppercase tracking-[0.06em]">
                Education
              </h2>
              <SectionMarkdown compact>{education}</SectionMarkdown>
            </section>
          )}
          {skills && (
            <section className="mt-8">
              <h2 className="mb-2 border-b border-[#747b82] pb-1 text-[12pt] font-medium uppercase tracking-[0.06em]">
                Skills
              </h2>
              <SectionMarkdown compact>{skills}</SectionMarkdown>
            </section>
          )}
        </aside>
        <main className="w-[62%] px-7 py-7">
          <SectionMarkdown>{mainWithoutSidebar}</SectionMarkdown>
        </main>
      </div>
    </div>
  );
};
