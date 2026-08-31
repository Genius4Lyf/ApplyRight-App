import React, { useEffect, useRef, useState } from 'react';
import AriaLoader from '../ui/AriaLoader';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Plus,
  PlayCircle,
  Pencil,
  Trash2,
  Check,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import InterviewPrepService from '../../services/interviewPrep.service';
import { CONFIDENCE_OPTIONS } from './PracticeRunner';

const AUTOSAVE_DELAY_MS = 3000;
// Project eslint doesn't count <motion.div> JSX as using `motion`; alias it
// like the rest of the codebase (see InterviewPrepDetail).
const MotionDiv = motion.div;

// Theme presentation. Keys mirror the backend enum
// (Application.interviewPrep.stories[].theme).
// `labelKey` resolves via t() at render; `badge` is presentation only.
const STORY_THEMES = [
  {
    id: 'leadership',
    labelKey: 'interviewPrep.storyBank.themes.leadership',
    badge:
      'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  },
  {
    id: 'problem_solving',
    labelKey: 'interviewPrep.storyBank.themes.problem_solving',
    badge:
      'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
  },
  {
    id: 'conflict',
    labelKey: 'interviewPrep.storyBank.themes.conflict',
    badge:
      'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',
  },
  {
    id: 'technical_achievement',
    labelKey: 'interviewPrep.storyBank.themes.technical_achievement',
    badge:
      'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
  },
  {
    id: 'failure_learning',
    labelKey: 'interviewPrep.storyBank.themes.failure_learning',
    badge:
      'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
  },
  {
    id: 'teamwork',
    labelKey: 'interviewPrep.storyBank.themes.teamwork',
    badge:
      'bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30',
  },
  {
    id: 'impact',
    labelKey: 'interviewPrep.storyBank.themes.impact',
    badge:
      'bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-500/30',
  },
];

const themeMeta = (id) =>
  STORY_THEMES.find((th) => th.id === id) || {
    id,
    labelKey: 'interviewPrep.storyBank.themeFallback',
    badge:
      'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  };

const STAR_FIELDS = [
  { key: 'situation', labelKey: 'interviewPrep.storyBank.star.situation' },
  { key: 'task', labelKey: 'interviewPrep.storyBank.star.task' },
  { key: 'action', labelKey: 'interviewPrep.storyBank.star.action' },
  { key: 'result', labelKey: 'interviewPrep.storyBank.star.result' },
];

// ── Empty state / generate CTA ──────────────────────────────────────────────
const StoryBankEmpty = ({ isCvOnly, generating, adRewarded, onGenerate }) => {
  const { t } = useTranslation();
  return (
    <section className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
            {t('interviewPrep.storyBank.emptyTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {t('interviewPrep.storyBank.emptySubtitle')}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        {t('interviewPrep.storyBank.emptyBody')}
      </p>
      {isCvOnly ? (
        <p className="mt-4 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
          {t('interviewPrep.storyBank.cvOnlyNote')}
        </p>
      ) : (
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="mt-4 group relative inline-flex items-center gap-2.5 pl-4 pr-2 py-2.5 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700/50 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          {generating ? (
            <>
              <AriaLoader inline tone="mono" size={16} label="" />{' '}
              {t('interviewPrep.storyBank.buildingStories')}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {t('interviewPrep.storyBank.generate')}
              <span className="inline-flex items-center gap-1 ml-1 pl-2 pr-2 py-0.5 rounded-md bg-amber-400 text-amber-950 text-[10px] font-bold uppercase tracking-wider">
                {adRewarded ? (
                  <>
                    <PlayCircle className="w-3 h-3" /> {t('interviewPrep.storyBank.adVideo')}
                  </>
                ) : (
                  t('interviewPrep.storyBank.fiveCredits')
                )}
              </span>
            </>
          )}
        </button>
      )}
      {!isCvOnly && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {adRewarded
            ? t('interviewPrep.storyBank.helpAd')
            : t('interviewPrep.storyBank.helpCredits')}
        </p>
      )}
    </section>
  );
};

// ── Editable story card ─────────────────────────────────────────────────────
const StoryCard = ({
  applicationId,
  story,
  warning,
  expanded,
  onToggle,
  onChanged,
  onPractice,
}) => {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const meta = themeMeta(story.theme);

  const answers = Array.isArray(story.answersQuestions) ? story.answersQuestions : [];
  const skills = Array.isArray(story.skillsProven) ? story.skillsProven : [];

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-card overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-4 p-4 cursor-pointer select-none text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${meta.badge}`}
            >
              {t(meta.labelKey)}
            </span>
            {answers.length > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">
                {t('interviewPrep.storyBank.answersCount', { n: answers.length })}
              </span>
            )}
            {story.confidence && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    story.confidence === 'ready'
                      ? 'bg-emerald-500'
                      : story.confidence === 'almost'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                  }`}
                />
                {t(`interviewPrep.practiceRunner.confidence.${story.confidence}`)}
              </span>
            )}
            {warning && warning.unsupportedClaims?.length > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">
                <AlertTriangle className="w-3 h-3 text-amber-500 dark:text-amber-300" />{' '}
                {t('interviewPrep.storyBank.verifyClaims')}
              </span>
            )}
          </div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
            {story.title || t('interviewPrep.storyBank.untitled')}
          </h4>
        </div>
        <div className="p-1 rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 mt-0.5 shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <MotionDiv
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/20">
              {editing ? (
                <StoryEditor
                  applicationId={applicationId}
                  story={story}
                  onChanged={onChanged}
                  onDone={() => setEditing(false)}
                />
              ) : (
                <StoryView
                  applicationId={applicationId}
                  story={story}
                  warning={warning}
                  skills={skills}
                  answers={answers}
                  onEdit={() => setEditing(true)}
                  onChanged={onChanged}
                  onPractice={onPractice}
                />
              )}
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Read-only story body + actions ──────────────────────────────────────────
const StoryView = ({
  applicationId,
  story,
  warning,
  skills,
  answers,
  onEdit,
  onChanged,
  onPractice,
}) => {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  const handleConfidence = async (level) => {
    const next = story.confidence === level ? null : level;
    setSaving(true);
    try {
      await InterviewPrepService.updateStoryConfidence(applicationId, story.id, next);
      onChanged?.();
    } catch {
      toast.error(t('interviewPrep.storyBank.failedReadiness'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-2">
      {warning && warning.unsupportedClaims?.length > 0 && (
        <div className="mb-3.5 p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-200 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">{t('interviewPrep.storyBank.verifyDetails')}</span>
            <ul className="list-disc list-inside mt-1 space-y-0.5 font-medium text-slate-700 dark:text-slate-200">
              {warning.unsupportedClaims.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              {t('interviewPrep.storyBank.editClears')}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {STAR_FIELDS.map(({ key, labelKey }) =>
          story[key] ? (
            <div
              key={key}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-sm"
            >
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-1">
                {t(labelKey)}
              </p>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {story[key]}
              </p>
            </div>
          ) : null
        )}
      </div>

      {skills.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
            {t('interviewPrep.storyBank.proves')}
          </span>
          {skills.map((s, i) => (
            <span
              key={i}
              className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {answers.length > 0 && (
        <div className="mt-2.5">
          <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
            {t('interviewPrep.storyBank.useToAnswer')}
          </p>
          <ul className="space-y-1">
            {answers.map((q, i) => (
              <li
                key={i}
                className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-3 border-l-2 border-slate-200 dark:border-slate-700"
              >
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(story.sourcedFrom) && story.sourcedFrom.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
            {t('interviewPrep.storyBank.grounded')}
          </span>
          {story.sourcedFrom.map((src, i) => (
            <span
              key={i}
              className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-semibold uppercase"
            >
              {src.type === 'experience' ? t('interviewPrep.storyBank.workHistory') : src.type}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3.5 mt-3.5 border-t border-slate-150 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPractice}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold"
          >
            <PlayCircle className="w-3.5 h-3.5" /> {t('interviewPrep.storyBank.practiceThis')}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> {t('interviewPrep.storyBank.edit')}
          </button>
        </div>
        <div className="sm:ml-auto flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mr-1">
            {t('interviewPrep.storyBank.readinessLabel')}
          </span>
          {CONFIDENCE_OPTIONS.map((opt) => {
            const active = story.confidence === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleConfidence(opt.id)}
                disabled={saving}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-lg border text-xs font-semibold transition-colors ${
                  active ? opt.activeClasses : opt.classes
                } disabled:opacity-60`}
              >
                {active ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                {t(opt.labelKey)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Inline editor with debounced autosave (mirrors NoteEditor) ──────────────
const StoryEditor = ({ applicationId, story, onChanged, onDone }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState({
    title: story.title || '',
    theme: story.theme || '',
    situation: story.situation || '',
    task: story.task || '',
    action: story.action || '',
    result: story.result || '',
    skillsProven: (story.skillsProven || []).join(', '),
    answersQuestions: (story.answersQuestions || []).join('\n'),
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const debounceRef = useRef(null);
  const firstRun = useRef(true);

  const buildPatch = (d) => ({
    title: d.title,
    theme: d.theme || undefined,
    situation: d.situation,
    task: d.task,
    action: d.action,
    result: d.result,
    skillsProven: d.skillsProven
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    answersQuestions: d.answersQuestions
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
  });

  const persist = async (d) => {
    setSaving(true);
    try {
      await InterviewPrepService.updateStory(applicationId, story.id, buildPatch(d));
      setSavedAt(new Date());
      onChanged?.();
    } catch {
      toast.error(t('interviewPrep.storyBank.failedSave'));
    } finally {
      setSaving(false);
    }
  };

  // Debounced autosave on any field change (skip the initial mount).
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => persist(draft), AUTOSAVE_DELAY_MS);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));

  const handleDone = async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    await persist(draft);
    onDone?.();
  };

  const inputCls =
    'w-full text-[16px] sm:text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:focus:ring-white/20 focus:border-slate-900 dark:focus:border-white placeholder-slate-400 dark:placeholder-slate-500';

  return (
    <div className="pt-2 space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={draft.title}
          onChange={set('title')}
          placeholder={t('interviewPrep.storyBank.storyTitlePlaceholder')}
          className={`${inputCls} sm:flex-1 font-semibold`}
        />
        <select value={draft.theme} onChange={set('theme')} className={`${inputCls} sm:w-52`}>
          <option value="">{t('interviewPrep.storyBank.themePlaceholder')}</option>
          {STORY_THEMES.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {t(theme.labelKey)}
            </option>
          ))}
        </select>
      </div>

      {STAR_FIELDS.map(({ key, labelKey }) => (
        <div key={key}>
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
            {t(labelKey)}
          </p>
          <textarea
            value={draft[key]}
            onChange={set(key)}
            rows={2}
            className={`${inputCls} mt-1 resize-y`}
          />
        </div>
      ))}

      <div>
        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
          {t('interviewPrep.storyBank.skillsProven')}
        </p>
        <input
          type="text"
          value={draft.skillsProven}
          onChange={set('skillsProven')}
          className={`${inputCls} mt-1`}
        />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
          {t('interviewPrep.storyBank.answersQuestions')}
        </p>
        <textarea
          value={draft.answersQuestions}
          onChange={set('answersQuestions')}
          rows={3}
          className={`${inputCls} mt-1 resize-y`}
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleDone}
          disabled={saving}
          className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-sm font-semibold disabled:bg-slate-300"
        >
          {t('interviewPrep.storyBank.done')}
        </button>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {saving ? (
            t('interviewPrep.storyBank.saving')
          ) : savedAt ? (
            <>
              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-300" />{' '}
              {t('interviewPrep.storyBank.saved')}
            </>
          ) : (
            t('interviewPrep.storyBank.autoSaves')
          )}
        </span>
      </div>
    </div>
  );
};

// ── Bank container ──────────────────────────────────────────────────────────
const StoryBank = ({
  applicationId,
  initialStories = [],
  warnings = [],
  isCvOnly,
  generating,
  adRewarded,
  onGenerate,
  onChange,
  onPracticeStory,
}) => {
  const { t } = useTranslation();
  const [stories, setStories] = useState(initialStories);
  const [expandedId, setExpandedId] = useState(null);
  const [adding, setAdding] = useState(false);

  // Keep local list in sync when the parent reloads (e.g. after generation).
  useEffect(() => {
    setStories(initialStories);
  }, [initialStories]);

  const warningFor = (idx) => (warnings || []).find((w) => w.index === idx);

  const handleAddStory = async () => {
    setAdding(true);
    try {
      const { story } = await InterviewPrepService.createStory(applicationId, {
        title: 'New story',
        theme: 'impact',
      });
      setStories((prev) => [...prev, story]);
      setExpandedId(story.id);
      onChange?.();
    } catch {
      toast.error(t('interviewPrep.storyBank.failedAdd'));
    } finally {
      setAdding(false);
    }
  };

  if (stories.length === 0) {
    return (
      <div className="space-y-4">
        <StoryBankEmpty
          isCvOnly={isCvOnly}
          generating={generating}
          adRewarded={adRewarded}
          onGenerate={onGenerate}
        />
        <button
          type="button"
          onClick={handleAddStory}
          disabled={adding}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100 underline underline-offset-4 decoration-slate-300 dark:decoration-slate-600 hover:decoration-slate-900 dark:hover:decoration-slate-100 disabled:opacity-60"
        >
          <Plus className="w-4 h-4" /> {t('interviewPrep.storyBank.addManually')}
        </button>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('interviewPrep.storyBank.storiesCount', { count: stories.length })}
        </p>
        <div className="flex items-center gap-2">
          {!isCvOnly && (
            <button
              type="button"
              onClick={onGenerate}
              disabled={generating}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-60 transition-colors"
              title={
                adRewarded
                  ? t('interviewPrep.storyBank.regenTitleAd')
                  : t('interviewPrep.storyBank.regenTitleCredits')
              }
            >
              {generating ? (
                <AriaLoader inline tone="mono" size={14} label={t('interviewPrep.storyBank.saving')} />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {t('interviewPrep.storyBank.regenerate')}
            </button>
          )}
          <button
            type="button"
            onClick={handleAddStory}
            disabled={adding}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold disabled:opacity-60"
          >
            <Plus className="w-3.5 h-3.5" /> {t('interviewPrep.storyBank.addStory')}
          </button>
        </div>
      </div>

      {stories.map((story, i) => (
        <StoryCard
          key={story.id || i}
          applicationId={applicationId}
          story={story}
          warning={warningFor(i)}
          expanded={expandedId === story.id}
          onToggle={() => setExpandedId(expandedId === story.id ? null : story.id)}
          onChanged={onChange}
          onPractice={() => onPracticeStory?.(story.id)}
        />
      ))}
    </section>
  );
};

export default StoryBank;
