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
//
// ── WHY EVERY HINT IS RENDERED, NOT JUST THE CURRENT ONE ──
//
// Swapping one hint for another changes this fieldset's height whenever the two wrap to a
// different number of lines — and on a phone, where the column is narrow, almost every pair
// does. The popover and the tips modal are both sized by their contents and both centred, so
// a one-line difference moved everything: tapping "Coach" made the whole card jump under the
// finger that tapped it.
//
// So all the hints are laid out in ONE grid cell and the inactive ones are hidden in place.
// The cell is therefore always as tall as the LONGEST hint, whichever is showing, and the
// height never changes.
//
// HIDDEN WITH OPACITY, not `visibility`. These controls are also rendered inside the tips
// modal, whose mobile tabs hide the whole settings panel with `invisible` — and `visibility`
// is inherited but RE-ENABLABLE, so a child marked `visible` punches back through a hidden
// ancestor. That is not a theory: it put the depth and style hints straight over the top of
// the tips text on the Tips tab. Opacity composites down and cannot be undone from inside, so
// it is the safe one to use in a component that does not own its surroundings. `aria-hidden`
// does the job `visibility: hidden` was doing for screen readers — one description, not four.
const Group = ({ label, options, value, onPick, labelFor, hintFor }) => (
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
    {hintFor && (
      <div className="mt-1.5 grid">
        {options.map((option) => (
          <p
            key={option}
            aria-hidden={option === value ? undefined : 'true'}
            className={`col-start-1 row-start-1 text-[12px] leading-snug text-slate-500 dark:text-slate-400 ${
              option === value ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            {hintFor(option)}
          </p>
        ))}
      </div>
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
        hintFor={(o) => t(`${base}.depth.${o}.hint`)}
      />
      <Group
        label={t(`${base}.styleLabel`)}
        options={STYLES}
        value={current.style}
        onPick={set('style')}
        labelFor={(o) => t(`${base}.style.${o}.label`)}
        hintFor={(o) => t(`${base}.style.${o}.hint`)}
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
