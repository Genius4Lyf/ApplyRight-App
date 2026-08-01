import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Mail, Phone, MapPin, Globe, Linkedin } from 'lucide-react';

const elementProps = (props) => {
  const clean = { ...props };
  delete clean.node;
  delete clean.children;
  return clean;
};

const MinimalistGridTemplate = ({ markdown, userProfile }) => {
  // Basic checks
  if (!markdown || typeof markdown !== 'string') return null;

  // Extract Name
  let name = 'YOUR NAME';
  try {
    const nameMatch = markdown.match(/^#\s+(.+)/m);
    const extractedName = nameMatch ? nameMatch[1] : null;
    if (extractedName && !extractedName.includes('YOUR NAME')) {
      name = extractedName;
    } else if (userProfile?.fullName || userProfile?.firstName) {
      name =
        userProfile.fullName ||
        [userProfile.firstName, userProfile.otherName, userProfile.lastName]
          .filter(Boolean)
          .join(' ');
    }
  } catch {
    name = 'YOUR NAME';
  }

  const roleTitle = userProfile?.currentJobTitle || '';

  // Contact Info
  const contactItems = [];
  if (userProfile?.email)
    contactItems.push({ icon: Mail, label: 'Email', value: userProfile.email });
  if (userProfile?.phone)
    contactItems.push({ icon: Phone, label: 'Phone', value: userProfile.phone });
  if (userProfile?.location)
    contactItems.push({ icon: MapPin, label: 'Location', value: userProfile.location });
  if (userProfile?.portfolioUrl)
    contactItems.push({
      icon: Globe,
      label: 'Portfolio',
      value: userProfile.portfolioUrl.replace(/^https?:\/\//, ''),
    });
  if (userProfile?.linkedinUrl)
    contactItems.push({
      icon: Linkedin,
      label: 'LinkedIn',
      value: userProfile.linkedinUrl.replace(/^https?:\/\//, ''),
    });

  // Remove first H1
  const bodyMarkdown = markdown.replace(/^#\s+.+$/m, '');

  return (
    <div
      className="bg-white mx-auto text-slate-800 flex"
      style={{
        lineHeight: 'var(--cv-leading, 1.38)',
        fontFamily: "var(--cv-font, 'Inter', sans-serif)",
      }}
    >
      {/* Header / Sidebar (Left 30%) */}
      <aside data-cv-sidebar className="w-[30%] border-r border-[#d7d5cf] bg-[#f2f1ed] p-8">
        <div>
          {userProfile?.photoUrl && (
            <div className="flex justify-center mb-4">
              <img
                src={userProfile.photoUrl}
                alt=""
                className="h-[72px] w-[72px] rounded-none border border-[#b9b7b0] object-cover grayscale"
              />
            </div>
          )}
          <div className="mb-5 h-1 w-10 bg-[#111318]" />
          <h1 className="mb-2 text-[22pt] font-extrabold leading-[1.02] tracking-[-0.04em] text-[#111318]">
            {name}
          </h1>
          {roleTitle && (
            <div className="mb-8 text-[8.5pt] font-semibold uppercase tracking-[0.18em] text-[#65645f]">
              {roleTitle}
            </div>
          )}

          <div className="space-y-4 border-t border-[#cfcdc6] pt-5 text-[8pt] text-[#555650]">
            {contactItems.map((item, i) => (
              <div key={i} className="break-words">
                <span className="mb-1 flex items-center gap-1.5 font-mono text-[7pt] font-semibold uppercase tracking-[0.14em] text-[#96958f]">
                  <item.icon size={9} className="text-[#777771]" />
                  {item.label}
                </span>
                <span className="leading-relaxed">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content (Right 70%) */}
      <main
        className="w-[70%]"
        style={{ padding: 'var(--cv-margin, 2.5rem)', paddingTop: 'var(--cv-margin, 2rem)' }}
      >
        <div className="cv-body space-y-2">
          <ReactMarkdown
            components={{
              h1: () => null,
              // H2: Clean section header with spacing
              h2: (props) => (
                <h2
                  className="mb-4 mt-8 flex items-center gap-3 text-[9pt] font-bold uppercase tracking-[0.18em] text-[#111318] first:mt-0 after:h-px after:flex-1 after:bg-[#d7d5cf]"
                  {...elementProps(props)}
                >
                  {props.children}
                </h2>
              ),
              // H3: Job Title - Bold
              h3: (props) => (
                <h3
                  className="mb-0.5 mt-5 text-[10.5pt] font-bold text-[#111318]"
                  {...elementProps(props)}
                >
                  {props.children}
                </h3>
              ),
              // H4: Company/Date - Small
              h4: (props) => (
                <h4
                  className="mb-2.5 text-[8.5pt] font-medium text-[#73746f]"
                  {...elementProps(props)}
                >
                  {props.children}
                </h4>
              ),
              // Standard text
              p: (props) => (
                <p
                  className="mb-3 text-[9.4pt] leading-[1.55] text-[#555650]"
                  {...elementProps(props)}
                >
                  {props.children}
                </p>
              ),
              ul: (props) => (
                <ul
                  className="mb-4 list-[square] space-y-1.5 pl-[1.15em] text-[9.4pt] leading-[1.5] text-[#555650] marker:text-[#111318]"
                  {...elementProps(props)}
                >
                  {props.children}
                </ul>
              ),
              li: (props) => <li {...elementProps(props)}>{props.children}</li>,
              a: (props) => (
                <a
                  className="font-medium text-[#111318] underline decoration-[#a7a59e] underline-offset-2"
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
      </main>
    </div>
  );
};

export default MinimalistGridTemplate;
