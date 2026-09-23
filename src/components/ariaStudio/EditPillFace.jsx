import React from 'react';
import { FilePen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// THE FACE OF THE EDIT CONTROL — one definition, two places that draw it.
//
// The Studio header has the real button; `EditModeUnlockedGuide` shows a replica of it,
// because that guide's whole job is "this is the thing you tap, here is what it looks
// like". A written description of an icon is worth much less than the icon.
//
// The replica was hand-copied markup, so when the header control became a bordered pill
// with a gold glyph and an EDIT label, the guide carried on showing the old bare pencil
// and taught people to look for a button that no longer exists. Shared now, so the next
// change to the header reaches the guide whether or not anyone remembers it exists.
//
// It renders the whole pill as a SPAN, appearance and all, and the caller supplies only
// behaviour: the header wraps it in a motion.button with press feedback and `aria-pressed`,
// the guide drops it in bare. That split is why there is no exported class helper to keep
// in step — the shape cannot be applied to one and not the other.
const EditPillFace = ({ active = false, showDot = false }) => {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors ${
        active
          ? 'border-slate-900 bg-slate-50 dark:border-slate-400 dark:bg-slate-800'
          : 'border-slate-200 hover:border-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-400 dark:hover:bg-slate-800'
      }`}
    >
      {/* The dot sits ON the icon rather than beside the label, so it is in the same
          place at every width. aria-hidden: the state is already in the button's label,
          so announcing the dot too would just be noise.

          The ring is `ring-white dark:ring-slate-950` — the header's own ground. Anything
          drawing this face elsewhere has to sit it on that same ground, or the ring reads
          as a halo instead of disappearing into the surface. */}
      <span className="relative inline-flex shrink-0">
        {/* The warm gold from the post designs (DESIGN-SYSTEM.md §2): #9A6608 on light,
            #DFA83C on dark — the doc prescribes that exact pair, the brighter one for a
            dark ground. It gives this control its own identity beside JD's emerald and CV
            health's red, so three pills in a row are told apart by colour before the label
            is read. */}
        <FilePen className="h-3.5 w-3.5 text-[#9A6608] dark:text-[#DFA83C]" />
        {showDot && (
          <span
            aria-hidden="true"
            className="studio-live-dot absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950"
          />
        )}
      </span>
      <span
        className={`font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors ${
          active
            ? 'text-slate-900 dark:text-white'
            : 'text-slate-700 group-hover:text-slate-900 dark:text-slate-200 dark:group-hover:text-white'
        }`}
      >
        {t('ariaStudio.livePreview.heading')}
      </span>
    </span>
  );
};

export default EditPillFace;
