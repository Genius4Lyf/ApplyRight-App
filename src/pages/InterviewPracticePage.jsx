import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { X, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import InterviewPrepService from '../services/interviewPrep.service';
import { getJobQuestions, getSkillPrep } from '../utils/interviewPrep';
import PracticeRunner from '../components/prep/PracticeRunner';
import { useMinVisible } from '../hooks/useMinVisible';

// Full-screen interview simulation. Owns the viewport — no Navbar / no nav
// chrome — so the experience feels like a real practice session.
const InterviewPracticePage = () => {
  const { applicationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const skillFilter = searchParams.get('skill');
  const questionIndexFilter = searchParams.get('questionIndex');

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
        // Seed confidence map from saved skill confidence.
        const seeded = {};
        getSkillPrep(app).forEach((s) => {
          if (s.confidence) seeded[`skill:${s.name}`] = s.confidence;
        });
        setConfidenceById(seeded);
      } catch (e) {
        toast.error(e.response?.data?.message || 'Failed to load practice');
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

    // Scoped to a single question index
    if (questionIndexFilter !== null) {
      const idx = parseInt(questionIndexFilter, 10);
      const q = questions[idx];
      if (q) {
        return [{
          id: `q:${idx}`,
          index: idx,
          kind: 'question',
          type: q.type,
          prompt: q.question,
          suggestedAnswer: q.suggestedAnswer || '',
        }];
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
        type: 'Skill',
        prompt: `Tell me about your experience with ${skill.name}.`,
        suggestedAnswer: skill.talkingPoint || 'No talking point saved for this skill yet.',
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
        }));
      return [skillCard, ...related];
    }

    // Default: all job questions.
    return questions.map((q, i) => ({
      id: `q:${i}`,
      index: i,
      kind: 'question',
      type: q.type,
      prompt: q.question,
      suggestedAnswer: q.suggestedAnswer || '',
    }));
  }, [application, skillFilter, questionIndexFilter]);

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
        toast.error('Failed to save confidence');
      }
    } else if (card.kind === 'question') {
      const dbIndex = card.index !== undefined ? card.index : parseInt(card.id.replace(/^q:/, ''), 10);
      try {
        await InterviewPrepService.updateQuestionConfidence(
          applicationId,
          card.prompt,
          dbIndex,
          nextLevel
        );
      } catch {
        toast.error('Failed to save confidence');
      }
    }
  };

  if (showLoader) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-indigo-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!application) return null;

  const headline = skillFilter
    ? `Practice: ${skillFilter}`
    : application.jobTitle || application.jobId?.title || 'Practice mode';

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {/* Row 1: status badge ↔ exit. Kept terse so the row never wraps. */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                <PlayCircle className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                Practice mode
              </span>
            </div>
            <button
              type="button"
              onClick={exitToDetail}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              <X className="w-3.5 h-3.5" />
              Exit
            </button>
          </div>
          {/* Row 2: headline ↔ progress meta. Headline truncates, meta has
              breathing room of its own. */}
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <p className="text-sm sm:text-base font-semibold text-slate-100 truncate min-w-0">
              {headline}
            </p>
            {cards.length > 0 && (
              <p className="text-[11px] text-slate-400 shrink-0 whitespace-nowrap">
                <span>
                  {markedCount}/{cards.length} marked
                </span>
                <span className="hidden sm:inline"> · Esc to exit</span>
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full bg-white text-slate-900 rounded-2xl p-6 sm:p-10 shadow-2xl">
          {cards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-base font-semibold text-slate-900 mb-2">Nothing to practice yet</p>
              <p className="text-sm text-slate-600 mb-6">
                {skillFilter
                  ? 'That skill has no talking point saved.'
                  : 'Run a job analysis to generate practice questions.'}
              </p>
              <button
                type="button"
                onClick={exitToDetail}
                className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
              >
                Back to prep
              </button>
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
