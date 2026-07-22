import React, { useState } from 'react';
import { CREDIT_COSTS } from '../../lib/credits';
import SkillsCard from '../cv/SkillsCard';
import AriaCard from './AriaCard';

// Skills for a build session — the SAME flow the CV builder's AriaChat runs: consent →
// CVService.generateSkills → SkillsCard → applySkills. The picking UI IS SkillsCard,
// imported directly rather than rebuilt, so grouping, "best for this role" and the
// per-skill detail popover behave identically on both surfaces.
//
// It runs after work history and projects because it READS them: the generation is
// grounded in what the user has already described, not invented from a job title.
const SkillsBuildCard = ({
  phase, // 'consent' | 'card'
  data, // { suggestions, bestForRole }
  existingSkills = [],
  hasJob,
  onGenerate,
  onAdd,
  onManual,
  onSkip,
  busy,
}) => {
  const cost = CREDIT_COSTS.GENERATE_SKILLS ?? 10;
  const [manual, setManual] = useState('');

  if (phase === 'card' && data) {
    return (
      <AriaCard cardKey="skillscard" wide>
        <div className="min-w-0 flex-1">
          <SkillsCard
            suggestions={data.suggestions}
            bestForRole={data.bestForRole}
            existingSkills={existingSkills}
            onAdd={onAdd}
          />
        </div>
      </AriaCard>
    );
  }

  return (
    <AriaCard cardKey="skillsconsent">
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            Skills
          </p>
          <span className="shrink-0 rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            −{cost} cr
          </span>
        </div>

        <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
          I&rsquo;ll read the roles and projects you just described and pull out the hard skills you
          can actually back up
          {hasJob ? ', weighted toward what this job asks for' : ''}. You pick which ones go in.
        </p>

        <button
          type="button"
          onClick={onGenerate}
          disabled={busy}
          className="btn-primary w-full mt-3 py-2 text-sm disabled:opacity-50"
        >
          {busy ? 'Reading your CV…' : `Find my skills · ${cost} cr`}
        </button>

        {/* Free alternative, offered plainly rather than buried — nobody should feel
            they have to spend credits to list skills they already know they have. */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <label
            htmlFor="studio-skills-manual"
            className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
          >
            Or type them yourself — free
          </label>
          <div className="flex items-center gap-2">
            <input
              id="studio-skills-manual"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manual.trim()) {
                  onManual?.(manual);
                  setManual('');
                }
              }}
              placeholder="Python, pressure testing, HSE…"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 px-3 py-2 text-[13px] outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 transition-colors"
            />
            <button
              type="button"
              onClick={() => {
                if (manual.trim()) {
                  onManual?.(manual);
                  setManual('');
                }
              }}
              disabled={!manual.trim() || busy}
              className="shrink-0 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <p className="mt-1 text-[10.5px] text-slate-400 dark:text-slate-500">Comma-separated.</p>
        </div>

        <button
          type="button"
          onClick={onSkip}
          disabled={busy}
          className="w-full mt-3 text-[11.5px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          Skip skills for now
        </button>
      </div>
    </AriaCard>
  );
};

export default SkillsBuildCard;
