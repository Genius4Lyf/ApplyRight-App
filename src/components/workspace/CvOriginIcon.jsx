import React from 'react';
import { PenLine } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AriaOrbit from '../cv/AriaOrbit';

// Where a CV came from: Aria built it in conversation, or you typed it in the builder.
//
// It matters most in the CV Studio, whose list holds both and where the two are otherwise
// indistinguishable — same title, same completion, same everything. It appears on the
// single-origin lists too (the builder's sidebar, Aria's Recents) even though nothing
// there needs telling apart, because that is where the vocabulary is learned: a mark you
// have only ever seen in the one place it disambiguates is a mark you have to decode.
//
// Carries a title + aria-label rather than sitting mute. An icon that means something is
// worth explaining once; an icon nobody can name is decoration with a cost.
const CvOriginIcon = ({ origin, size = 13, className = '' }) => {
  const { t } = useTranslation();
  if (origin !== 'aria' && origin !== 'builder') return null;

  const label = t(origin === 'aria' ? 'workspace.origin.aria' : 'workspace.origin.builder');

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center ${className}`}
    >
      {origin === 'aria' ? (
        <AriaOrbit size={size} />
      ) : (
        <PenLine
          style={{ width: size, height: size }}
          className="text-slate-400 dark:text-slate-500"
        />
      )}
    </span>
  );
};

export default CvOriginIcon;
