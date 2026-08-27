import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CVTemplateRenderer from '../CVTemplateRenderer';
import TemplatePreviewThumb from '../TemplatePreviewThumb';
import { TEMPLATES, paperColor, sidebarFill } from '../../data/templates';
import { DEFAULT_TEMPLATE_ID } from '../../lib/cvDownload';
import { generateMarkdownFromDraft } from '../../utils/markdownUtils';
import { useAriaStudio } from '../../context/AriaStudioContext';

const A4_WIDTH = 794;
const A4_HEIGHT = 1122;

// The clean half of Live Preview. It deliberately owns no editing affordances:
// this is the production renderer users will download, while StudioLivePreview's
// structured document remains the one stable surface for editing every CV.
const StudioTemplatePreview = () => {
  const { t } = useTranslation();
  const { cvData, selectTemplate } = useAriaStudio();
  const viewportRef = useRef(null);
  const documentRef = useRef(null);
  const [scale, setScale] = useState(0.6);
  const [contentHeight, setContentHeight] = useState(A4_HEIGHT);

  const templateId = cvData?.templateId || DEFAULT_TEMPLATE_ID;
  const selected = TEMPLATES.find((template) => template.id === templateId) || TEMPLATES[0];
  const sidebar = sidebarFill(templateId);
  const application = useMemo(() => {
    if (!cvData) return null;
    return {
      _id: cvData._id,
      optimizedCV: generateMarkdownFromDraft(cvData).optimizedCV,
      templateId,
      personalInfo: cvData.personalInfo,
      isDraft: true,
      outputLang: cvData.outputLang,
    };
  }, [cvData, templateId]);

  // Templates read the profile shape from the classic builder (`firstName`/`lastName`/
  // `location`/`linkedinUrl`/`portfolioUrl`), not Studio's `personalInfo` shape
  // (`fullName`/`address`/`linkedin`/`website`) — same mapping ResumeReview's
  // mergedUserProfile uses, minus the /auth/me merge Studio has no equivalent of.
  const templateProfile = useMemo(() => {
    const info = cvData?.personalInfo || {};
    const [firstName, ...rest] = (info.fullName || '').trim().split(/\s+/).filter(Boolean);
    return {
      ...info, // fullName, email, phone, photoUrl stay as-is for templates that read them directly
      firstName: firstName || '',
      lastName: rest.join(' '),
      otherName: '',
      location: info.address || '',
      linkedinUrl: info.linkedin || '',
      portfolioUrl: info.website || '',
    };
  }, [cvData?.personalInfo]);

  // Fit the real 794px-wide template into whichever Studio pane/sheet owns it.
  // Transform does not affect layout dimensions, so the wrapper below receives the
  // scaled width and measured height explicitly to keep every page scrollable.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const documentNode = documentRef.current;
    if (!viewport || !documentNode || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => {
      const available = Math.max(240, viewport.clientWidth - 32);
      setScale(Math.min(1, available / A4_WIDTH));
      setContentHeight(Math.max(A4_HEIGHT, documentNode.scrollHeight));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(documentNode);
    if (document.fonts?.ready) document.fonts.ready.then(measure);
    return () => observer.disconnect();
  }, [application]);

  if (!application) return null;

  return (
    <div className="h-full min-h-0 flex flex-col bg-slate-50 dark:bg-slate-950">
      <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {t('ariaStudio.livePreview.chooseTemplate')}
            </p>
            <p className="mt-0.5 truncate text-[12px] font-semibold text-slate-700 dark:text-slate-200">
              {selected?.name}
            </p>
          </div>
          <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
            {t('ariaStudio.livePreview.previewHint')}
          </span>
        </div>

        <div
          className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 scrollbar-none"
          role="listbox"
          aria-label={t('ariaStudio.livePreview.chooseTemplate')}
        >
          {TEMPLATES.map((template) => {
            const active = template.id === templateId;
            return (
              <button
                key={template.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => selectTemplate?.(template.id)}
                className={`group/template relative w-[66px] shrink-0 overflow-hidden rounded-md border bg-white text-left transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 dark:bg-slate-950 ${
                  active
                    ? 'border-slate-900 ring-1 ring-slate-900 dark:border-white dark:ring-white'
                    : 'border-slate-200 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-500'
                }`}
                title={template.name}
              >
                <div className="relative h-[72px] overflow-hidden border-b border-slate-100 bg-white dark:border-slate-800">
                  <TemplatePreviewThumb templateId={template.id} width={64} />
                  {template.isPro && (
                    <span className="absolute right-1 top-1 rounded bg-slate-900/85 px-1 py-0.5 text-[7px] font-bold leading-none text-white">
                      PRO
                    </span>
                  )}
                  {active && (
                    <span className="absolute bottom-1 right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check className="h-2.5 w-2.5" aria-hidden="true" />
                    </span>
                  )}
                </div>
                <span className="block truncate px-1.5 py-1 text-[9px] font-medium text-slate-600 dark:text-slate-300">
                  {template.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={viewportRef}
        className="h-0 flex-1 overflow-auto overscroll-contain p-4 scrollbar-none"
      >
        <div
          className="mx-auto transition-[width,height] duration-200"
          style={{ width: A4_WIDTH * scale, height: contentHeight * scale }}
        >
          <div
            ref={documentRef}
            className={`cv-template-container relative origin-top-left text-black shadow-[0_2px_4px_rgba(15,23,42,.08),0_18px_48px_-20px_rgba(15,23,42,.35)] transition-transform duration-200 ${
              // Bleeds the template's own sidebar 3px past its bottom edge. The band
              // behind it is the SAME colour, but the two meet on a fractional pixel
              // (the page is transform-scaled), which shows as a hairline across the
              // column. Same class CV Studio applies, for the same reason.
              sidebar ? 'cv-continuous-sidebar' : ''
            }`}
            style={{
              width: A4_WIDTH,
              minWidth: A4_WIDTH,
              minHeight: A4_HEIGHT,
              // The page keeps its full A4 height on purpose (a CV is a sheet), so it has
              // to be the template's own paper colour — otherwise a short CV ends in a
              // white block halfway down.
              backgroundColor: paperColor(templateId),
              transform: `scale(${scale})`,
              '--cv-leading': 1.5,
            }}
          >
            {/* Full-page sidebar band, for templates whose coloured column is a design
                element. Same treatment CV Studio gives it, from the same registry.

                ABSOLUTE, and that is load-bearing: out of flow it adds nothing to the
                measured content height, so it cannot push a one-page CV onto a second
                page. `inset-y-0` spans exactly this page and no further, so it also
                can't inflate scrollHeight — which the height measurement above reads.
                The template's own sidebar paints over this across the content region;
                below the content, only this band shows. */}
            {sidebar && (
              <div
                aria-hidden="true"
                className={`absolute inset-y-0 ${sidebar.className}`}
                style={{ [sidebar.side]: 0, width: sidebar.width, zIndex: 0 }}
              />
            )}
            <div className="relative" style={{ zIndex: 1 }}>
              <CVTemplateRenderer application={application} userProfile={templateProfile} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudioTemplatePreview;
