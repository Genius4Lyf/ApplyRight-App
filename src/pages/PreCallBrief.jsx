import React, { useEffect, useState } from 'react';
import AriaLoader from '../components/ui/AriaLoader';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Target,
  BookOpen,
  MessageSquare,
  Sparkles,
  HelpCircle,
  StickyNote,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import InterviewPrepService from '../services/interviewPrep.service';
import {
  getJobQuestions,
  getQuestionsToAsk,
  getSkillPrep,
  getStories,
  computeReadiness,
} from '../utils/interviewPrep';
import { useMinVisible } from '../hooks/useMinVisible';
import RoomBrief from '../components/prep/RoomBrief';

const CONF_RANK = { ready: 3, almost: 2, needs_work: 1 };
const rankOf = (c) => CONF_RANK[c] ?? 0;

// Local theme-label dictionary (module-level constant) → i18n KEYS resolved via
// t() at render. Kept local to this file per the round's scoping note.
const THEME_LABEL_KEYS = {
  leadership: 'interviewPrep.preCallBrief.themes.leadership',
  problem_solving: 'interviewPrep.preCallBrief.themes.problemSolving',
  conflict: 'interviewPrep.preCallBrief.themes.conflict',
  technical_achievement: 'interviewPrep.preCallBrief.themes.technicalAchievement',
  failure_learning: 'interviewPrep.preCallBrief.themes.failureLearning',
  teamwork: 'interviewPrep.preCallBrief.themes.teamwork',
  impact: 'interviewPrep.preCallBrief.themes.impact',
};

const Section = ({ icon, title, hint, children }) => (
  <section className="break-inside-avoid">
    <div className="flex items-center gap-2 mb-2">
      {React.createElement(icon, {
        className: 'w-4 h-4 text-indigo-600 dark:text-indigo-300 shrink-0',
      })}
      <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
        {title}
      </h2>
      {hint && (
        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{hint}</span>
      )}
    </div>
    {children}
  </section>
);

const PreCallBrief = () => {
  const { t } = useTranslation();
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const showLoader = useMinVisible(loading, 500);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { application: app } = await InterviewPrepService.getOne(applicationId);
        if (!cancelled) setApplication(app);
      } catch (e) {
        if (!cancelled) toast.error(e.response?.data?.message || t('interviewPrep.preCallBrief.loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  if (showLoader) {
    return <AriaLoader fullscreen size={40} label={t('interviewPrep.preCallBrief.loading')} />;
  }

  if (!application) return null;

  const job = application.jobId || {};
  const title = job.title || application.jobTitle || t('interviewPrep.preCallBrief.interviewFallback');
  const company = job.company || application.jobCompany || '';

  const readiness = computeReadiness(application);
  const stories = [...getStories(application)]
    .sort((a, b) => rankOf(b.confidence) - rankOf(a.confidence))
    .slice(0, 3);
  const questions = [...getJobQuestions(application)]
    .map((q, i) => ({ ...q, _i: i }))
    .sort((a, b) => rankOf(a.confidence) - rankOf(b.confidence))
    .slice(0, 5);
  const skills = getSkillPrep(application)
    .filter((s) => s.name)
    .slice(0, 10);
  const askThem = getQuestionsToAsk(application).slice(0, 5);
  const notes = (
    Array.isArray(application.interviewPrep?.userNotes) ? application.interviewPrep.userNotes : []
  ).filter((n) => (n.body && n.body.trim()) || (n.title && n.title.trim()));

  const isEmpty =
    stories.length === 0 &&
    questions.length === 0 &&
    skills.length === 0 &&
    askThem.length === 0 &&
    notes.length === 0;

  const scoreColor =
    readiness.score >= 75
      ? 'text-emerald-600 dark:text-emerald-300'
      : readiness.score >= 45
        ? 'text-amber-600 dark:text-amber-300'
        : 'text-rose-600 dark:text-rose-300';

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      {/* Top bar — hidden when printing */}
      <header className="print:hidden sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(`/interview-prep/${applicationId}`)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <ArrowLeft className="w-4 h-4" /> {t('interviewPrep.common.backToPrep')}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
          >
            <Printer className="w-3.5 h-3.5" /> {t('interviewPrep.preCallBrief.printSave')}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 sm:p-8 space-y-7">
          {/* Title block */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-300">
                {t('interviewPrep.preCallBrief.eyebrow')}
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 leading-tight">
                {title}
              </h1>
              {company && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{company}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className={`font-heading text-2xl font-bold tabular-nums ${scoreColor}`}>
                {readiness.score}%
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wide">
                {t('interviewPrep.common.ready')}
              </p>
            </div>
          </div>

          {/* The room brief — what the live interviewer no longer says out loud.
              Rendered before everything else and regardless of whether any prep
              has been generated: it is derived, not generated, so it is always
              available and it is the part that prevents a freeze. */}
          <RoomBrief
            careerStage={application.careerStage}
            panel={application.interviewPrep?.panel?.seats || []}
            style={application.interviewPrep?.style}
            challenge={application.interviewPrep?.challenge}
            mustHaves={skills.map((s) => s.name)}
            archetype={application.archetype}
          />

          {isEmpty ? (
            <div className="text-center py-10">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                {t('interviewPrep.preCallBrief.emptyTitle')}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
                {t('interviewPrep.preCallBrief.emptyBody')}
              </p>
              <button
                type="button"
                onClick={() => navigate(`/interview-prep/${applicationId}`)}
                className="print:hidden px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
              >
                {t('interviewPrep.common.backToPrep')}
              </button>
            </div>
          ) : (
            <>
              {/* Readiness line */}
              <Section icon={Target} title={t('interviewPrep.preCallBrief.secWhereStand')}>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                    {t('interviewPrep.preCallBrief.readyCount', { n: readiness.counts.ready })}
                  </span>
                  {readiness.counts.almost > 0 && (
                    <> · {t('interviewPrep.preCallBrief.almostCount', { n: readiness.counts.almost })}</>
                  )}
                  {readiness.counts.needs_work > 0 && (
                    <>
                      {' '}
                      ·{' '}
                      <span className="text-rose-700 dark:text-rose-300 font-semibold">
                        {t('interviewPrep.preCallBrief.needWorkCount', {
                          n: readiness.counts.needs_work,
                        })}
                      </span>
                    </>
                  )}
                  {readiness.counts.unrated > 0 && (
                    <> · {t('interviewPrep.preCallBrief.notRatedCount', { n: readiness.counts.unrated })}</>
                  )}{' '}
                  {t('interviewPrep.preCallBrief.acrossItems', { count: readiness.total })}
                </p>
              </Section>

              {/* Lead stories */}
              {stories.length > 0 && (
                <Section
                  icon={BookOpen}
                  title={t('interviewPrep.preCallBrief.secLeadStories')}
                  hint={t('interviewPrep.preCallBrief.hintStrongest')}
                >
                  <div className="space-y-3">
                    {stories.map((s) => (
                      <div
                        key={s.id}
                        className="border border-slate-200 dark:border-slate-700 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {s.title || t('interviewPrep.preCallBrief.storyFallback')}
                          </span>
                          {s.theme && (
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-indigo-600 dark:text-indigo-300">
                              {THEME_LABEL_KEYS[s.theme] ? t(THEME_LABEL_KEYS[s.theme]) : s.theme}
                            </span>
                          )}
                        </div>
                        {s.result && (
                          <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                            <span className="font-semibold text-slate-500 dark:text-slate-400">
                              {t('interviewPrep.preCallBrief.resultLabel')}{' '}
                            </span>
                            {s.result}
                          </p>
                        )}
                        {(s.situation || s.action) && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {[s.situation, s.action].filter(Boolean).join(' → ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Questions to review */}
              {questions.length > 0 && (
                <Section
                  icon={MessageSquare}
                  title={t('interviewPrep.preCallBrief.secQuestions')}
                  hint={t('interviewPrep.preCallBrief.hintWeakest')}
                >
                  <div className="space-y-3">
                    {questions.map((q) => (
                      <div
                        key={q._i}
                        className="border-l-2 border-indigo-200 dark:border-indigo-500/30 pl-3"
                      >
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {q.question}
                        </p>
                        {q.suggestedAnswer && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed whitespace-pre-line">
                            {q.suggestedAnswer}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Skills — name + soundbite to drop into skill-probe answers */}
              {skills.length > 0 && (
                <Section icon={Sparkles} title={t('interviewPrep.preCallBrief.secSkills')}>
                  <div className="space-y-2">
                    {skills.map((s, i) => (
                      <div key={i} className="text-sm">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                          {s.name}
                        </span>
                        {s.talkingPoint && (
                          <span className="text-slate-600 dark:text-slate-300">
                            {' '}
                            — {s.talkingPoint}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Questions to ask them */}
              {askThem.length > 0 && (
                <Section icon={HelpCircle} title={t('interviewPrep.preCallBrief.secAskThem')}>
                  <ul className="space-y-1.5">
                    {askThem.map((q, i) => (
                      <li
                        key={i}
                        className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pl-3 border-l-2 border-emerald-200 dark:border-emerald-500/30"
                      >
                        {q}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Notes */}
              {notes.length > 0 && (
                <Section icon={StickyNote} title={t('interviewPrep.preCallBrief.secDontForget')}>
                  <div className="space-y-2">
                    {notes.map((n, i) => (
                      <div
                        key={n.id || i}
                        className="bg-amber-50/60 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 rounded-lg p-3"
                      >
                        {n.title && n.title.trim() && (
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {n.title}
                          </p>
                        )}
                        {n.body && (
                          <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 whitespace-pre-line leading-relaxed">
                            {n.body}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}

          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center pt-2 border-t border-slate-100 dark:border-slate-800">
            {t('interviewPrep.preCallBrief.footer')}
          </p>
        </div>
      </main>
    </div>
  );
};

export default PreCallBrief;
