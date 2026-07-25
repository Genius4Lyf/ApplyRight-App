import React from 'react';
import { Clock, Users, Lightbulb, FileText, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { buildRoomBrief } from '../../lib/interviewBrief';

// The pre-call brief. Everything the live interviewer stopped saying mid-session
// (Phase 3) is said HERE instead — before the call, where it prevents a freeze
// rather than rescuing one and breaking character.
//
// Derived entirely from data the app already has. No AI call, no credits.
const Row = ({ icon, title, children }) => (
  <section className="break-inside-avoid">
    <div className="flex items-center gap-2 mb-1.5">
      {React.createElement(icon, {
        className: 'w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0',
      })}
      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
        {title}
      </h3>
    </div>
    {children}
  </section>
);

const RoomBrief = ({
  careerStage,
  interviewer,
  panel,
  style,
  challenge,
  plannedSec,
  mustHaves,
  archetype,
  compact = false,
}) => {
  const { t } = useTranslation();
  // `compact` only adds card chrome for callers that drop this into a page with
  // no surface of its own. Every row is always open, in its authored order —
  // the brief is what prevents a freeze, so none of it hides behind a toggle.
  const brief = buildRoomBrief({
    careerStage,
    interviewer,
    panel,
    style,
    challenge,
    plannedSec,
    mustHaves,
    archetype,
  });

  return (
    <div
      className={`space-y-5 ${
        compact
          ? 'rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5'
          : ''
      }`}
    >
      {/* (a) what kind of interview + how long */}
      <Row icon={Clock} title={t('interviewPrep.roomBrief.whatThisIs')}>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {t(brief.kind.labelKey, brief.kind.labelParams)}
          {brief.minutes > 0 && (
            <span className="font-normal text-slate-500 dark:text-slate-400">
              {' '}
              · {t('interviewPrep.roomBrief.aboutMin', { minutes: brief.minutes })}
            </span>
          )}
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
          {t(brief.kind.aboutKey, brief.kind.aboutParams)}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          {t(brief.challengeNoteKey)}
        </p>
      </Row>

      {/* (b) what this interviewer cares about */}
      {(brief.lookingForKeys.length > 0 ||
        brief.caresAbout.length > 0 ||
        brief.topics.length > 0) && (
        <Row icon={Users} title={t('interviewPrep.roomBrief.whatTheyCareAbout')}>
          {/* From the archetype's arc — what this round is actually weighing. */}
          {brief.lookingForKeys.length > 0 && (
            <ul className="space-y-1 mb-2">
              {brief.lookingForKeys.map((k, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed"
                >
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-slate-400 dark:bg-slate-500" />
                  <span>{t(k)}</span>
                </li>
              ))}
            </ul>
          )}
          {brief.caresAbout.length > 0 && (
            <ul className="space-y-1 mb-2">
              {brief.caresAbout.map((c, i) => (
                <li key={i} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{c.who}</span>
                  {c.role && (
                    <span className="text-slate-500 dark:text-slate-400"> · {c.role}</span>
                  )}
                  {c.focus && <> — {c.focus}</>}
                </li>
              ))}
            </ul>
          )}
          {brief.topics.length > 0 && (
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('interviewPrep.roomBrief.likelyToComeUp', { topics: brief.topics.join(', ') })}
            </p>
          )}
        </Row>
      )}

      {/* (c) ⭐ what counts as evidence — stage aware. The single most important
          thing moved out of the room. */}
      <Row icon={Lightbulb} title={t('interviewPrep.roomBrief.whatCountsAsEvidence')}>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3.5">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {t(brief.evidence.headlineKey)}
          </p>
          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
            {t(brief.evidence.bodyKey)}
          </p>
          <ul className="mt-2 space-y-1">
            {brief.evidence.sourceKeys.map((k, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed"
              >
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-slate-400 dark:bg-slate-500" />
                <span>{t(k)}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
            {t(brief.evidence.closerKey)}
          </p>
        </div>
      </Row>

      {/* (d) they have your CV */}
      <Row icon={FileText} title={t('interviewPrep.roomBrief.theyHaveYourCv')}>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {t(brief.cvNoteKey)}
        </p>
      </Row>

      {/* (e) permission to be bad at it */}
      <Row icon={RefreshCw} title={t('interviewPrep.roomBrief.allowedToBeBad')}>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {t(brief.permissionKey)}
        </p>
      </Row>
    </div>
  );
};

export default RoomBrief;
