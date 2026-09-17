import React from 'react';
import { useTranslation } from 'react-i18next';
import { DEPTHS, STYLES, VOICES, PACES, normalizeCallSettings } from '../../lib/ariaCallSettings';

// The four call choices, as plain segmented controls.
//
// Shared by the chip's popover beside the call button and by the tips shown before a first
// call, so there is one set of controls to keep honest rather than two that drift.
//
// Each group shows a one-line description of the CURRENT choice rather than all of them at
// once — enough to explain what "Coach" actually does, without turning a settings popover
// into a page to read. The minute cost is said where it is true: Coach talks more, and Aria
// speaking is billed at twice the rate of Aria listening.
const Group = ({ label, options, value, onPick, labelFor, hint }) => (
  <fieldset className="min-w-0">
    <legend className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
      {label}
    </legend>
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onPick(option)}
            className={`rounded-full border px-3 py-1 text-[12.5px] font-semibold transition-colors ${
              active
                ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                : 'border-slate-300 text-slate-600 hover:border-slate-500 dark:border-slate-600 dark:text-slate-300 dark:hover:border-slate-400'
            }`}
          >
            {labelFor(option)}
          </button>
        );
      })}
    </div>
    {hint && (
      <p className="mt-1.5 text-[12px] leading-snug text-slate-500 dark:text-slate-400">{hint}</p>
    )}
  </fieldset>
);

const AriaCallSettingsControls = ({ value, onChange }) => {
  const { t } = useTranslation();
  const current = normalizeCallSettings(value);
  const set = (field) => (next) => onChange?.({ ...current, [field]: next });
  const base = 'ariaStudio.ariaLive.settings';

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <Group
        label={t(`${base}.depthLabel`)}
        options={DEPTHS}
        value={current.depth}
        onPick={set('depth')}
        labelFor={(o) => t(`${base}.depth.${o}.label`)}
        hint={t(`${base}.depth.${current.depth}.hint`)}
      />
      <Group
        label={t(`${base}.styleLabel`)}
        options={STYLES}
        value={current.style}
        onPick={set('style')}
        labelFor={(o) => t(`${base}.style.${o}.label`)}
        hint={t(`${base}.style.${current.style}.hint`)}
      />
      <Group
        label={t(`${base}.voiceLabel`)}
        options={VOICES}
        value={current.voice}
        onPick={set('voice')}
        labelFor={(o) => t(`${base}.voice.${o}`)}
      />
      <Group
        label={t(`${base}.paceLabel`)}
        options={PACES}
        value={current.pace}
        onPick={set('pace')}
        labelFor={(o) => t(`${base}.pace.${o}`)}
      />
    </div>
  );
};

export default AriaCallSettingsControls;
