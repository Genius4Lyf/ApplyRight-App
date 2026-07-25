import React, { useEffect, useMemo, useState } from 'react';
import AriaLoader from '../components/ui/AriaLoader';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import InterviewPrepService from '../services/interviewPrep.service';
import { getJobQuestions, getSkillPrep, getStories } from '../utils/interviewPrep';
import PracticeRunner from '../components/prep/PracticeRunner';
import { useMinVisible } from '../hooks/useMinVisible';

// Full-screen interview simulation. Owns the viewport — no Navbar / no nav
// chrome — so the experience feels like a real practice session.
const InterviewPracticePage = () => {
  const { t } = useTranslation();
  const { applicationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const skillFilter = searchParams.get('skill');
  const questionIndexFilter = searchParams.get('questionIndex');
  const storyFilter = searchParams.get('story');
  const weakFilter = searchParams.get('filter') === 'weak';

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confidenceById, setConfidenceById] = useState({});
  const showLoader = useMinVisible(loading, 600);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { application: app } = await InterviewPrepService.getOne(applicationId);
        if (cancelled) return;
        setApplication(app);
        // Seed confidence map from saved skill + story confidence.
        const seeded = {};
        getSkillPrep(app).forEach((s) => {
          if (s.confidence) seeded[`skill:${s.name}`] = s.confidence;
        });
        getStories(app).forEach((s) => {
          if (s.confidence) seeded[`story:${s.id}`] = s.confidence;
        });
        setConfidenceById(seeded);
      } catch (e) {
        toast.error(e.response?.data?.message || t('interviewPrep.practice.loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  const cards = useMemo(() => {
    if (!application) return [];
    const skills = getSkillPrep(application);
    const questions = getJobQuestions(application);

    // Scoped to a single story: one flashcard whose "answer" is the assembled
    // STAR story. The prompt uses one of the story's own answersQuestions
    // (the explicit backref) — no fuzzy matching.
    if (storyFilter) {
      const story = getStories(application).find((s) => s.id === storyFilter);
      if (!story) return [];
      const starText = [
        [t('interviewPrep.practice.star.situation'), story.situation],
        [t('interviewPrep.practice.star.task'), story.task],
        [t('interviewPrep.practice.star.action'), story.action],
        [t('interviewPrep.practice.star.result'), story.result],
      ]
        .filter(([, v]) => v && v.trim())
        .map(([label, v]) => `${label}: ${v}`)
        .join('\n\n');
      const prompt =
        (Array.isArray(story.answersQuestions) && story.answersQuestions[0]) ||
        story.title ||
        t('interviewPrep.practice.fallbackPrompt');
      return [
        {
          id: `story:${story.id}`,
          storyId: story.id,
          kind: 'story',
          type: t('interviewPrep.practice.story'),
          prompt,
          suggestedAnswer: starText || t('interviewPrep.practice.noStoryDetails'),
          confidence: story.confidence,
        },
      ];
    }

    // Scoped to a single question index
    if (questionIndexFilter !== null) {
      const idx = parseInt(questionIndexFilter, 10);
      const q = questions[idx];
      if (q) {
        return [
          {
            id: `q:${idx}`,
            index: idx,
            kind: 'question',
            type: q.type,
            prompt: q.question,
            suggestedAnswer: q.suggestedAnswer || '',
            attempts: q.attempts || [],
          },
        ];
      }
    }

    // Scoped to a single skill: lead with the talking point, then any
    // questions whose sourcedFrom evidence references that skill name. We
    // don't have a skill→question backref in the schema, so fall back to
    // showing only the talking point if nothing matches.
    if (skillFilter) {
      const skill = skills.find((s) => s.name === skillFilter);
      if (!skill) return [];
      const skillCard = {
        id: `skill:${skill.name}`,
        kind: 'skill',
        type: t('interviewPrep.practice.skill'),
        prompt: t('interviewPrep.practice.skillPrompt', { skill: skill.name }),
        suggestedAnswer: skill.talkingPoint || t('interviewPrep.practice.noTalkingPoint'),
      };
      // Naive heuristic: include questions whose text mentions the skill name.
      const lower = skill.name.toLowerCase();
      const related = questions
        .filter(
          (q) =>
            q.question?.toLowerCase().includes(lower) ||
            q.suggestedAnswer?.toLowerCase().includes(lower)
        )
        .map((q, i) => ({
          id: `q:${skill.name}:${i}`,
          index: questions.indexOf(q),
          kind: 'question',
          type: q.type,
          prompt: q.question,
          suggestedAnswer: q.suggestedAnswer || '',
          attempts: q.attempts || [],
        }));
      return [skillCard, ...related];
    }

    // Weak spots: every job question not yet rated 'ready'.
    if (weakFilter) {
      return questions
        .map((q, i) => ({ q, i }))
        .filter(({ q }) => q.confidence !== 'ready')
        .map(({ q, i }) => ({
          id: `q:${i}`,
          index: i,
          kind: 'question',
          type: q.type,
          prompt: q.question,
          suggestedAnswer: q.suggestedAnswer || '',
          attempts: q.attempts || [],
        }));
    }

    // Default: all job questions.
    return questions.map((q, i) => ({
      id: `q:${i}`,
      index: i,
      kind: 'question',
      type: q.type,
      prompt: q.question,
      suggestedAnswer: q.suggestedAnswer || '',
      attempts: q.attempts || [],
    }));
  }, [application, skillFilter, questionIndexFilter, storyFilter, weakFilter, t]);

  // Esc closes the practice view.
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') exitToDetail();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exitToDetail = () => navigate(`/interview-prep/${applicationId}`);

  const markedCount = Object.keys(confidenceById).length;

  const handleMarkConfidence = async (card, level) => {
    const nextLevel = confidenceById[card.id] === level ? null : level;
    setConfidenceById((prev) => {
      const next = { ...prev };
      if (nextLevel) next[card.id] = nextLevel;
      else delete next[card.id];
      return next;
    });

    if (card.kind === 'skill') {
      try {
        await InterviewPrepService.updateSkillConfidence(
          applicationId,
          card.id.replace(/^skill:/, ''),
          nextLevel
        );
      } catch {
        toast.error(t('interviewPrep.practice.confidenceError'));
      }
    } else if (card.kind === 'story') {
      try {
        await InterviewPrepService.updateStoryConfidence(applicationId, card.storyId, nextLevel);
      } catch {
        toast.error(t('interviewPrep.practice.confidenceError'));
      }
    } else if (card.kind === 'question') {
      const dbIndex =
        card.index !== undefined ? card.index : parseInt(card.id.replace(/^q:/, ''), 10);
      try {
        await InterviewPrepService.updateQuestionConfidence(
          applicationId,
          card.prompt,
          dbIndex,
          nextLevel
        );
      } catch {
        toast.error(t('interviewPrep.practice.confidenceError'));
      }
    }
  };

  if (showLoader) {
    return <AriaLoader fullscreen size={40} label={t('interviewPrep.practice.loading')} />;
  }

  if (!application) return null;

  const storyForHeadline = storyFilter
    ? getStories(application).find((s) => s.id === storyFilter)
    : null;
  const headline = weakFilter
    ? t('interviewPrep.practice.headlineWeak')
    : storyForHeadline
      ? t('interviewPrep.practice.headlineStory', {
          title: storyForHeadline.title || t('interviewPrep.practice.story'),
        })
      : skillFilter
        ? t('interviewPrep.practice.headlineSkill', { skill: skillFilter })
        : application.jobTitle || application.jobId?.title || t('interviewPrep.practice.mode');

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gradient-to-b from-slate-50 via-white to-indigo-50/60 dark:from-slate-900 dark:via-slate-950 dark:to-indigo-950/30 text-slate-900 dark:text-slate-100">
      <header className="shrink-0 border-b border-slate-200/70 dark:border-slate-700/70 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {/* Row 1: status badge ↔ exit. Kept terse so the row never wraps. */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
                <PlayCircle className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
                {t('interviewPrep.practice.mode')}
              </span>
            </div>
            <button
              type="button"
              onClick={exitToDetail}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              {t('interviewPrep.practice.exit')}
            </button>
          </div>
          {/* Row 2: headline ↔ progress meta. Headline truncates, meta has
              breathing room of its own. */}
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate min-w-0">
              {headline}
            </p>
            {cards.length > 0 && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 whitespace-nowrap">
                <span>
                  {t('interviewPrep.practice.marked', {
                    marked: markedCount,
                    total: cards.length,
                  })}
                </span>
                <span className="hidden sm:inline"> {t('interviewPrep.practice.escToExit')}</span>
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 flex justify-center px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div className="w-full max-w-3xl flex flex-col min-h-0">
          {cards.length === 0 ? (
            <div className="m-auto w-full relative overflow-hidden rounded-3xl border border-indigo-100 dark:border-indigo-500/30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-8 text-center shadow-[0_10px_40px_-16px_rgba(79,70,229,0.4)]">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full bg-gradient-to-br from-indigo-200/50 to-violet-200/40 blur-3xl"
              />
              <div className="relative z-10">
                <p className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                  {weakFilter
                    ? t('interviewPrep.practice.emptyCaughtUp')
                    : t('interviewPrep.practice.emptyNothing')}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  {weakFilter
                    ? t('interviewPrep.practice.emptyWeakBody')
                    : skillFilter
                      ? t('interviewPrep.practice.emptySkillBody')
                      : t('interviewPrep.practice.emptyBody')}
                </p>
                <button
                  type="button"
                  onClick={exitToDetail}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-500/20"
                >
                  {t('interviewPrep.common.backToPrep')}
                </button>
              </div>
            </div>
          ) : (
            <PracticeRunner
              applicationId={applicationId}
              cards={cards}
              confidenceById={confidenceById}
              onMarkConfidence={handleMarkConfidence}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default InterviewPracticePage;
