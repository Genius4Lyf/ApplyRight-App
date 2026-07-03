import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

/**
 * Lightweight chip/tag editor for string-array fields (career goals, skills).
 * Adds on Enter or comma; de-dupes case-insensitively; respects an optional max.
 * Controlled — owns no source of truth, just emits the next array via onChange.
 */
const TagInput = ({ values = [], onChange, placeholder = 'Type and press Enter', maxTags }) => {
  const [draft, setDraft] = useState('');

  const addTag = (raw) => {
    const tag = raw.trim().replace(/,+$/, '').trim();
    if (!tag) return;
    if (maxTags && values.length >= maxTags) return;
    const exists = values.some((v) => v.toLowerCase() === tag.toLowerCase());
    if (exists) {
      setDraft('');
      return;
    }
    onChange([...values, tag]);
    setDraft('');
  };

  const removeTag = (idx) => onChange(values.filter((_, i) => i !== idx));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === 'Backspace' && !draft && values.length) {
      // Backspace on an empty input removes the last chip.
      removeTag(values.length - 1);
    }
  };

  const atMax = maxTags && values.length >= maxTags;

  return (
    <div className="w-full p-2 border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 dark:bg-slate-900 dark:border-slate-600">
      <div className="flex flex-wrap gap-1.5">
        {values.map((tag, idx) => (
          <span
            key={`${tag}-${idx}`}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(idx)}
              className="p-1.5 -m-1 inline-flex items-center justify-center hover:text-indigo-900 dark:hover:text-indigo-100"
              aria-label={`Remove ${tag}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <div className="flex items-center gap-1 flex-1 min-w-[120px]">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => addTag(draft)}
            placeholder={atMax ? `Max ${maxTags} reached` : placeholder}
            disabled={atMax}
            className="flex-1 min-w-0 px-1 py-1 text-sm bg-transparent outline-none text-slate-900 dark:text-slate-100 dark:placeholder-slate-500 disabled:cursor-not-allowed"
          />
          {draft.trim() && !atMax && (
            <button
              type="button"
              onClick={() => addTag(draft)}
              className="shrink-0 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
              aria-label="Add"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TagInput;
