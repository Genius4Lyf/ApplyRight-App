import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Lock } from 'lucide-react';
import {
  TEMPLATES,
  TEMPLATE_GROUP_ORDER,
  supportsGround,
  GROUND_CHOICES,
} from '../../data/templates';
import TemplatePreviewThumb from '../TemplatePreviewThumb';
import { designAtsVerdict } from '../../lib/cvDesignAts';
import { supportsTypeScale } from '../../lib/cvDesignVars';

// THE CV STUDIO'S TEMPLATES + DESIGN PANEL.
//
// Lifted out of ResumeReview so it can be rendered in two places without being written
// twice. It used to be one <div> doing both jobs through `fixed lg:relative` class
// toggles — which worked, but meant the phone got a hand-rolled bottom drawer with no
// portal, no focus trap, no Escape, no scroll lock and no history entry, and there was
// nowhere to put those without also changing the desktop column.
//
// Now: an inline column at desktop widths, and a StudioOverlay side sheet below them.
// Same body in both. This component knows nothing about which one it is in — it renders
// a scroll container and its host supplies the frame.
//
// `onClose` is optional for exactly that reason: inline there is nothing to close, and a
// template pick should not try to. The sheet passes it, the column does not.

// Score → editorial band accent (>=75 emerald / >=50 amber / else rose). Moved here with
// the body: nothing outside this panel reads a band.
const bandText = (s) =>
  s >= 75
    ? 'text-emerald-600 dark:text-emerald-400'
    : s >= 50
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-rose-600 dark:text-rose-400';
const bandDot = (s) => (s >= 75 ? 'bg-emerald-500' : s >= 50 ? 'bg-amber-500' : 'bg-rose-500');

// The panel's one repeated shape: a labelled row of mutually exclusive choices. It was
// copied out three times with the classes retyped each time; adding text size and section
// spacing would have made five. Extracted rather than duplicated, so the controls cannot
// drift apart visually one edit at a time.
const Segmented = ({ label, hint, value, options, onChange }) => (
  <div>
    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 mb-2.5">
      {label}
    </p>
    <div className="flex border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
            value === o.value
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
    {hint && (
      <p className="mt-1.5 text-[11px] leading-snug text-slate-400 dark:text-slate-500">{hint}</p>
    )}
  </div>
);

const StudioDesignRail = ({
  // What is being designed
  application,
  isDraftMode,
  activeTab,
  atsReadiness,
  userProfile,
  // The panel's own view state
  railTab,
  setRailTab,
  insightsOpen,
  setInsightsOpen,
  templateGroup,
  setTemplateGroup,
  // The document's presentation
  design,
  setDesign,
  templateId,
  onSelectTemplate,
  isUnlocked,
  // Host-supplied
  navigate,
  onClose,
}) => {
  // NOTE the shadow: the template list below maps its items as `t`, so inside that map
  // `t` is a template, not the translator. Every t(...) call in this file is deliberately
  // outside it.
  const { t } = useTranslation();

  // Deterministic, recomputed on every render — it is three comparisons over values that
  // are already here. Memoising it would cost more than it saves and would need a
  // dependency list to keep honest.
  const ats = designAtsVerdict(templateId, design, userProfile);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      {/* a) Insights strip — collapsible editorial summary (replaces the pastel boxes). */}
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
        {!isDraftMode ? (
          <>
            <button
              type="button"
              onClick={() => setInsightsOpen((v) => !v)}
              className="w-full flex items-center gap-2.5 text-left"
              aria-expanded={insightsOpen}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${bandDot(application?.fitScore ?? 0)}`}
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 flex-1">
                Fit score
              </span>
              <span
                className={`font-heading text-lg font-bold tabular-nums ${bandText(application?.fitScore ?? 0)}`}
              >
                {application?.fitScore ?? 0}%
              </span>
              <ChevronDown
                size={16}
                className={`text-slate-400 dark:text-slate-500 transition-transform ${insightsOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {insightsOpen && (
              <div className="mt-3 space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Optimized for {application?.jobId?.title || application?.jobTitle || 'the role'}.
                </p>
                {/* Free users get the standard analysis (GPT-4o-mini); nudge them
                    toward the premium ApplyRight ATS analysis (GPT-4o). */}
                {userProfile?.plan !== 'paid' && (
                  <button
                    type="button"
                    onClick={() => navigate('/upgrade')}
                    className="inline-flex items-start gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 hover:underline text-left"
                  >
                    <Crown className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    Upgrade to ApplyRight ATS for our sharpest, recruiter-grade analysis
                  </button>
                )}
              </div>
            )}
          </>
        ) : atsReadiness ? (
          <>
            <button
              type="button"
              onClick={() => setInsightsOpen((v) => !v)}
              className="w-full flex items-center gap-2.5 text-left"
              aria-expanded={insightsOpen}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${bandDot(atsReadiness.score)}`}
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 flex-1">
                ATS readiness
              </span>
              <span
                className={`font-heading text-lg font-bold tabular-nums ${bandText(atsReadiness.score)}`}
              >
                {atsReadiness.score}
              </span>
              <ChevronDown
                size={16}
                className={`text-slate-400 dark:text-slate-500 transition-transform ${insightsOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {insightsOpen && (
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  {atsReadiness.checks?.map((check, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {check.passed ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
                      )}
                      <span
                        className={
                          check.passed
                            ? 'text-slate-600 dark:text-slate-300'
                            : 'text-slate-500 dark:text-slate-400'
                        }
                      >
                        {check.label}
                        {check.detail && (
                          <span className="text-slate-400 dark:text-slate-500 ml-1">
                            ({check.detail})
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                {atsReadiness.tips?.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 mb-1.5">
                      Tips
                    </p>
                    <ul className="space-y-1">
                      {atsReadiness.tips.slice(0, 3).map((tip, i) => (
                        <li
                          key={i}
                          className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed flex gap-1.5"
                        >
                          <span className="text-slate-400 dark:text-slate-500 shrink-0 mt-0.5">
                            –
                          </span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            Live draft preview
          </p>
        )}
      </div>

      {/* b) Rail tabs — Templates / Design (ink underline like the masthead). */}
      <div className="px-5 flex gap-5 border-b border-slate-100 dark:border-slate-800">
        {['templates', 'design'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setRailTab(tab)}
            className={`relative py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors ${
              railTab === tab
                ? 'text-slate-900 dark:text-slate-100'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab}
            {railTab === tab && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-slate-900 dark:bg-white rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* c/d) Rail body — Templates (grouped) or the Design placeholder. */}
      <div className="p-5">
        {activeTab !== 'resume' ? (
          <p className="text-center text-xs text-slate-500 dark:text-slate-400 py-14 px-4 leading-relaxed">
            Template styles apply to the CV. Switch to Resume to choose one.
          </p>
        ) : railTab === 'design' ? (
          <div className="space-y-6">
            {/* WILL A MACHINE READ THIS? First, because it is a verdict on the choices
                below it — and because the whole reason to design a CV here rather than
                ask a chat window for one is that this can see the page. */}
            <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    ats.level === 'clear' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  {t('cvStudio.atsDesign.heading')}
                </p>
                <span
                  className={`ml-auto font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${
                    ats.level === 'clear'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {t(
                    ats.level === 'clear'
                      ? 'cvStudio.atsDesign.clear'
                      : 'cvStudio.atsDesign.caution'
                  )}
                </span>
              </div>

              {ats.notes.length === 0 ? (
                <>
                  <p className="mt-2 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                    {t('cvStudio.atsDesign.clearBody')}
                  </p>
                  {/* Naming what was examined is what makes "clear" mean something. An
                      unexplained pass reads as a checker that did not look. */}
                  <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
                    {ats.checked.join(' · ')}
                  </p>
                </>
              ) : (
                <ul className="mt-2.5 space-y-2.5">
                  {ats.notes.map((note) => (
                    <li key={note.id}>
                      <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">
                        {note.title}
                      </p>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                        {note.detail}
                      </p>
                      {/* Only where a fix honestly exists. A "fix" button beside a
                          trade-off — the photo — would be telling someone their own
                          market's convention is a mistake. */}
                      {note.fix === 'single-column' && (
                        <button
                          type="button"
                          onClick={() => {
                            setRailTab('templates');
                            setTemplateGroup('Simple');
                          }}
                          className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-slate-900 underline underline-offset-2 dark:text-white"
                        >
                          {t('cvStudio.atsDesign.showSingleColumn')}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Typeface — body-font override via --cv-font. Curated Google
                Fonts (loaded in index.html + injected into the PDF head); each
                template keeps its own font as the fallback when Default. */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 mb-2.5">
                {t('cvStudio.designPanel.typeface')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Default', value: '' },
                  { label: 'Inter', value: 'Inter, sans-serif' },
                  { label: 'Source Sans', value: "'Source Sans 3', sans-serif" },
                  { label: 'Georgia', value: "Georgia, 'Times New Roman', serif" },
                  { label: 'Merriweather', value: 'Merriweather, serif' },
                  { label: 'Lora', value: 'Lora, serif' },
                ].map((f) => (
                  <button
                    key={f.label}
                    type="button"
                    onClick={() => setDesign((d) => ({ ...d, font: f.value }))}
                    className={`flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2.5 transition-all ${
                      design.font === f.value
                        ? 'border-slate-900 ring-1 ring-slate-900 bg-slate-50 dark:bg-slate-800 dark:border-white dark:ring-white'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <span
                      className="text-lg leading-none text-slate-900 dark:text-slate-100"
                      style={{ fontFamily: f.value || undefined }}
                    >
                      Aa
                    </span>
                    <span className="max-w-full truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      {f.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Page colour — sets --cv-ground, and repaints the sheet behind the
                CV to match. Shown ONLY for the handful of templates where the
                ground is the single large colour on the page (supportsGround).
                Everywhere else the page carries a masthead band, a sidebar or
                colour blocks that were designed against their own ground, and
                letting someone recolour underneath them produces a document that
                fights itself — so the control is absent rather than disabled: a
                greyed-out row invites "why not?", a missing one reads as "not part
                of this template". */}
            {supportsGround(templateId) && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 mb-2.5">
                  {t('cvStudio.designPanel.pageColour')}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Default = clear it → the template's own paper. */}
                  <button
                    type="button"
                    onClick={() => setDesign((d) => ({ ...d, ground: '' }))}
                    className={`h-8 px-3 rounded-full border text-[11px] font-semibold transition-all ${
                      design.ground === ''
                        ? 'border-slate-900 dark:border-white ring-2 ring-slate-900/30 dark:ring-white/30 text-slate-900 dark:text-slate-100'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    Default
                  </button>
                  {GROUND_CHOICES.map((sw) => (
                    <button
                      key={sw.value}
                      type="button"
                      onClick={() => setDesign((d) => ({ ...d, ground: sw.value }))}
                      title={sw.name}
                      aria-label={sw.name}
                      className={`w-8 h-8 rounded-full transition-all ${
                        design.ground === sw.value
                          ? 'ring-2 ring-slate-900 dark:ring-white ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
                          : 'ring-1 ring-black/10 dark:ring-white/10 hover:scale-105'
                      }`}
                      style={{ backgroundColor: sw.value }}
                    />
                  ))}
                </div>
              </div>
            )}
            {/* TEXT SIZE — scales the whole document via `zoom`, so it moves the page
                count with it. Hidden on sidebar templates, which cannot take it: their
                sidebar is pinned with `position: fixed` in the print clone so Chrome
                repeats it per page, and a zoomed ancestor of a fixed element is an unknown
                that would only misbehave inside the PDF. Showing a dead control would be
                worse than showing none. */}
            {supportsTypeScale(templateId) && (
              <Segmented
                label={t('cvStudio.designPanel.textSize')}
                value={design.textSize || 'normal'}
                onChange={(v) => setDesign((d) => ({ ...d, textSize: v }))}
                options={[
                  { value: 'small', label: t('cvStudio.designPanel.textSizeOpt.small') },
                  { value: 'normal', label: t('cvStudio.designPanel.textSizeOpt.normal') },
                  { value: 'large', label: t('cvStudio.designPanel.textSizeOpt.large') },
                ]}
              />
            )}

            {/* SECTION SPACING — the air between one section and the next. */}
            <Segmented
              label={t('cvStudio.designPanel.sectionGap')}
              value={design.sectionGap || 'normal'}
              onChange={(v) => setDesign((d) => ({ ...d, sectionGap: v }))}
              options={[
                { value: 'tight', label: t('cvStudio.designPanel.sectionGapOpt.tight') },
                { value: 'normal', label: t('cvStudio.designPanel.sectionGapOpt.normal') },
                { value: 'airy', label: t('cvStudio.designPanel.sectionGapOpt.airy') },
              ]}
            />

            {/* Margins — preview padding + the PDF's, from the same variable. */}
            <Segmented
              label={t('cvStudio.designPanel.margins')}
              value={design.margins}
              onChange={(v) => setDesign((d) => ({ ...d, margins: v }))}
              options={[
                { value: 'narrow', label: t('cvStudio.designPanel.marginsOpt.narrow') },
                { value: 'normal', label: t('cvStudio.designPanel.marginsOpt.normal') },
                { value: 'wide', label: t('cvStudio.designPanel.marginsOpt.wide') },
              ]}
            />

            {/* Paper size — sets the preview dimensions + the PDF @page size. Not
                translated: A4 and Letter are the names of the paper everywhere. */}
            <Segmented
              label={t('cvStudio.designPanel.paperSize')}
              value={design.paper}
              onChange={(v) => setDesign((d) => ({ ...d, paper: v }))}
              options={[
                { value: 'a4', label: 'A4' },
                { value: 'letter', label: 'Letter' },
              ]}
            />

            {/* LINE HEIGHT. Labelled "Density" until now, which described neither what
                it set (--cv-leading) nor what it did — and sat next to a margins control
                that also changes how dense the page looks. */}
            <Segmented
              label={t('cvStudio.designPanel.lineHeight')}
              value={design.density}
              onChange={(v) => setDesign((d) => ({ ...d, density: v }))}
              options={[
                { value: 'compact', label: t('cvStudio.designPanel.lineHeightOpt.compact') },
                { value: 'normal', label: t('cvStudio.designPanel.lineHeightOpt.normal') },
                { value: 'relaxed', label: t('cvStudio.designPanel.lineHeightOpt.relaxed') },
              ]}
            />
          </div>
        ) : (
          <div className="space-y-6 scrollbar-none">
            {/* One family at a time. Nineteen templates stacked meant scrolling
                past four families to reach the fifth, and a group you did not want
                was still a screen of scrolling to get past.

                A scrolling ROW rather than a wrapped block: the order carries
                meaning (plainest first) and wrapping breaks the reading of it, and
                on a phone this rail is ~300px wide. `snap` so a flick lands on a
                chip instead of between two. */}
            <div
              role="tablist"
              aria-label={t('cvStudio.templateFilter.ariaLabel')}
              className="-mx-1 flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-1 pb-2 scrollbar-none"
            >
              {TEMPLATE_GROUP_ORDER.map((groupName) => {
                const count = TEMPLATES.filter((tpl) => tpl.group === groupName).length;
                if (!count) return null;
                const active = templateGroup === groupName;
                return (
                  <button
                    key={groupName}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTemplateGroup(groupName)}
                    className={`shrink-0 snap-start rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                        : 'border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-100'
                    }`}
                  >
                    {groupName}
                    {/* The count is the reason the chip is worth pressing: it says
                        how much is behind it before you commit a tap. */}
                    <span className={active ? 'opacity-60' : 'opacity-70'}> {count}</span>
                  </button>
                );
              })}
            </div>
            {[templateGroup].map((groupName) => {
              const groupTemplates = TEMPLATES.filter((t) => t.group === groupName);
              if (!groupTemplates.length) return null;
              return (
                <div key={groupName} className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    {groupTemplates.map((t, i) => {
                      const locked = !isUnlocked(t.id);
                      const isDanglingLast =
                        i === groupTemplates.length - 1 && groupTemplates.length % 2 === 1;
                      return (
                        <div
                          key={t.id}
                          onClick={() => {
                            onSelectTemplate(t.id);
                            // Dismisses the sheet; a no-op in the inline column, which
                            // passes no onClose because there is nothing to close.
                            onClose?.();
                          }}
                          className={`${isDanglingLast ? 'col-span-2' : ''} cursor-pointer rounded-lg border overflow-hidden transition-all ${
                            templateId === t.id
                              ? 'border-slate-900 ring-1 ring-slate-900 dark:border-white dark:ring-white'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          {/* Live mini-render of the actual CV in this style. */}
                          <div className="relative flex justify-center overflow-hidden bg-white border-b border-slate-200 dark:border-slate-800">
                            <TemplatePreviewThumb templateId={t.id} width={110} />
                            {/* Faint dim on locked styles. */}
                            {locked && (
                              <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/50" />
                            )}
                            {/* Lock icon on gated styles. */}
                            {locked && (
                              <div className="absolute top-1 right-1 p-0.5 bg-slate-800/90 rounded">
                                <Lock size={10} className="text-white" />
                              </div>
                            )}
                            {/* Tier badge — FREE / {cost} CR / PRO. */}
                            <div
                              className={`absolute bottom-1 right-1 px-1.5 py-0.5 text-[8px] font-bold rounded leading-none ${
                                t.cost === 0
                                  ? 'bg-emerald-500 text-white'
                                  : locked
                                    ? 'bg-slate-800 text-white'
                                    : 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                              }`}
                            >
                              {t.cost === 0 ? 'FREE' : locked ? `${t.cost} CR` : 'PRO'}
                            </div>
                          </div>
                          {/* Caption. */}
                          <div
                            className={`flex items-center gap-1.5 px-2 py-1.5 ${
                              templateId === t.id ? 'bg-slate-100 dark:bg-slate-800' : ''
                            }`}
                          >
                            <span className="flex-1 text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                              {t.name}
                            </span>
                            {templateId === t.id && (
                              <Check
                                size={13}
                                className="shrink-0 text-slate-900 dark:text-slate-100"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudioDesignRail;
