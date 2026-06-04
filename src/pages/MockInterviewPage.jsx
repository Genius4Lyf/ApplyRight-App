import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  X,
  Mic,
  MicOff,
  Send,
  SkipForward,
  RefreshCw,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  Check,
  Trophy,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import InterviewPrepService from '../services/interviewPrep.service';
import { getJobQuestions } from '../utils/interviewPrep';
import { useMinVisible } from '../hooks/useMinVisible';

const MAX_QUESTIONS = 6;
const STAR_DIMS = ['situation', 'task', 'action', 'result'];

// Aggregate the collected per-question grade results into a session report.
const buildReport = (results) => {
  const graded = results.filter((r) => r && typeof r.score === 'number');
  if (graded.length === 0) {
    return { graded, overall: 0, strengths: [], gaps: [], drill: [] };
  }
  const overall = Math.round(graded.reduce((s, r) => s + r.score, 0) / graded.length);

  const covered = {};
  STAR_DIMS.forEach((d) => {
    covered[d] = graded.filter((r) => r.starBreakdown?.[d]?.covered).length;
  });
  const n = graded.length;
  const strengths = STAR_DIMS.filter((d) => covered[d] / n >= 0.75);
  const gaps = STAR_DIMS.filter((d) => covered[d] / n < 0.5);
  const drill = [...graded]
    .filter((r) => r.score < 70)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  return { graded, overall, strengths, gaps, drill };
};

const scoreTone = (s) =>
  s > 75 ? 'text-emerald-600' : s > 45 ? 'text-amber-600' : 'text-rose-600';
const scoreBg = (s) =>
  s > 75
    ? 'bg-emerald-100 text-emerald-700'
    : s > 45
      ? 'bg-amber-100 text-amber-700'
      : 'bg-rose-100 text-rose-700';

const MockInterviewPage = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const showLoader = useMinVisible(loading, 500);

  const [phase, setPhase] = useState('intro'); // intro | running | report
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState('');
  const [grading, setGrading] = useState(false);
  const [results, setResults] = useState([]); // per-question { question, type, answer, ...grade }
  const [ranOutOfCredits, setRanOutOfCredits] = useState(false);

  // Voice dictation (Web Speech API; no-op where unsupported, e.g. Android WebView).
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { application: app } = await InterviewPrepService.getOne(applicationId);
        if (!cancelled) setApplication(app);
      } catch (e) {
        if (!cancelled) toast.error(e.response?.data?.message || 'Failed to load mock interview');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechReg = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechReg) return;
    const rec = new SpeechReg();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setAnswer((prev) => (prev ? (prev.endsWith(' ') ? prev : prev + ' ') : '') + transcript);
    };
    rec.onerror = () => setIsRecording(false);
    rec.onend = () => setIsRecording(false);
    recognitionRef.current = rec;
  }, []);

  const questions = useMemo(
    () => getJobQuestions(application).slice(0, MAX_QUESTIONS),
    [application]
  );

  const exitToDetail = () => navigate(`/interview-prep/${applicationId}`);

  const toggleRecording = () => {
    const rec = recognitionRef.current;
    if (!rec) {
      toast.error('Voice input is not supported here — please type your answer.');
      return;
    }
    if (isRecording) {
      rec.stop();
      setIsRecording(false);
    } else {
      try {
        rec.start();
        setIsRecording(true);
      } catch {
        /* already started */
      }
    }
  };

  const stopRecording = () => {
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const finish = () => {
    stopRecording();
    setPhase('report');
  };

  const advanceOrFinish = () => {
    if (current + 1 >= questions.length) {
      finish();
    } else {
      setCurrent((c) => c + 1);
      setAnswer('');
    }
  };

  const handleSubmit = async () => {
    if (!answer.trim()) {
      toast.error('Type or dictate an answer, or skip this question.');
      return;
    }
    stopRecording();
    const q = questions[current];
    setGrading(true);
    try {
      const res = await InterviewPrepService.gradeAnswer(
        applicationId,
        q.question,
        current,
        answer
      );
      setResults((prev) => [
        ...prev,
        {
          question: q.question,
          type: q.type,
          answer,
          score: res.score,
          starBreakdown: res.starBreakdown,
          overallFeedback: res.overallFeedback,
          refinedAnswer: res.refinedAnswer,
        },
      ]);
      if (typeof res.remainingCredits === 'number') {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: res.remainingCredits }));
      }
      advanceOrFinish();
    } catch (e) {
      const code = e.response?.data?.code;
      if (code === 'INSUFFICIENT_CREDITS') {
        setRanOutOfCredits(true);
        toast.error('Out of credits — ending the mock here.');
        finish();
      } else {
        toast.error(e.response?.data?.message || 'Failed to grade that answer.');
      }
    } finally {
      setGrading(false);
    }
  };

  const handleSkip = () => {
    stopRecording();
    setAnswer('');
    advanceOrFinish();
  };

  if (showLoader) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-indigo-400 rounded-full animate-spin" />
      </div>
    );
  }
  if (!application) return null;

  const title = application.jobTitle || application.jobId?.title || 'Mock interview';

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
            Mock interview
          </span>
          <button
            type="button"
            onClick={exitToDetail}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            <X className="w-3.5 h-3.5" /> Exit
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-start sm:items-center justify-center px-4 sm:px-6 py-6 sm:py-8">
        <div className="w-full max-w-3xl">
          {phase === 'intro' && (
            <IntroView
              title={title}
              count={questions.length}
              onStart={() => setPhase('running')}
              onCancel={exitToDetail}
            />
          )}

          {phase === 'running' && questions.length > 0 && (
            <RunningView
              question={questions[current]}
              index={current}
              total={questions.length}
              answer={answer}
              setAnswer={setAnswer}
              grading={grading}
              isRecording={isRecording}
              onToggleRecording={toggleRecording}
              onSubmit={handleSubmit}
              onSkip={handleSkip}
            />
          )}

          {phase === 'report' && (
            <ReportView
              results={results}
              ranOutOfCredits={ranOutOfCredits}
              onPracticeWeak={() =>
                navigate(`/interview-prep/${applicationId}/practice?filter=weak`)
              }
              onRetake={() => {
                setResults([]);
                setCurrent(0);
                setAnswer('');
                setRanOutOfCredits(false);
                setPhase('intro');
              }}
              onDone={exitToDetail}
            />
          )}
        </div>
      </main>
    </div>
  );
};

// ── Intro ───────────────────────────────────────────────────────────────────
const IntroView = ({ title, count, onStart, onCancel }) => (
  <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-10 shadow-2xl text-center">
    <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
      <PlayCircle className="w-7 h-7" />
    </div>
    <h1 className="text-xl sm:text-2xl font-bold">Mock interview</h1>
    <p className="text-sm text-slate-500 mt-1">{title}</p>

    {count === 0 ? (
      <>
        <p className="text-sm text-slate-600 mt-5">
          No interview questions yet. Generate them on the prep page first.
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="mt-5 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
        >
          Back to prep
        </button>
      </>
    ) : (
      <>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <Stat value={count} label={count === 1 ? 'question' : 'questions'} />
          <Stat value={`≤ ${count}`} label="credits" />
          <Stat value="STAR" label="graded" />
        </div>
        <p className="text-xs text-slate-500 mt-4 leading-relaxed">
          You&apos;ll answer each question back-to-back with <strong>no feedback</strong> until the
          end — just like the real thing. Each graded answer costs 1 credit; skipping is free.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={onStart}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
          >
            Start interview
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </>
    )}
  </div>
);

const Stat = ({ value, label }) => (
  <div className="rounded-lg bg-slate-50 border border-slate-100 py-3">
    <p className="text-lg font-bold text-slate-900">{value}</p>
    <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{label}</p>
  </div>
);

// ── Running ──────────────────────────────────────────────────────────────────
const RunningView = ({
  question,
  index,
  total,
  answer,
  setAnswer,
  grading,
  isRecording,
  onToggleRecording,
  onSubmit,
  onSkip,
}) => {
  const typeLabel = question.type
    ? question.type.charAt(0).toUpperCase() + question.type.slice(1)
    : 'Question';
  const isLast = index + 1 >= total;

  return (
    <div className="bg-white text-slate-900 rounded-2xl p-5 sm:p-8 shadow-2xl">
      {/* Progress */}
      <div className="flex items-center gap-1.5 mb-5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i < index
                ? 'w-6 bg-indigo-600'
                : i === index
                  ? 'flex-1 bg-indigo-600'
                  : 'w-6 bg-slate-200'
            }`}
          />
        ))}
      </div>

      <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
        Question {index + 1} of {total} · {typeLabel}
      </p>
      <h2 className="text-base sm:text-lg font-semibold text-slate-900 leading-snug mt-1.5">
        {question.question}
      </h2>

      <div className="relative mt-4">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={7}
          disabled={grading}
          placeholder="Answer out loud, or type here. Cover the Situation, Task, Action, and Result."
          className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 placeholder-slate-400 resize-y disabled:bg-slate-50"
        />
        {isRecording && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-pink-50 text-pink-700 text-[10px] font-bold border border-pink-200 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-pink-600 rounded-full animate-ping" /> Recording
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleRecording}
          disabled={grading}
          className={`p-2.5 rounded-lg shadow-sm transition-all disabled:opacity-40 ${
            isRecording
              ? 'bg-pink-600 hover:bg-pink-700 text-white'
              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
          }`}
          title={isRecording ? 'Stop voice' : 'Dictate'}
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        <span className="text-[11px] text-slate-400">{answer.length} chars</span>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onSkip}
            disabled={grading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40"
          >
            <SkipForward className="w-4 h-4" /> Skip
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={grading || !answer.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {grading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Grading…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> {isLast ? 'Submit & finish' : 'Submit & next'}
                <span className="ml-0.5 text-[9px] font-bold bg-indigo-500 px-1.5 py-0.5 rounded uppercase">
                  1 cr
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Report ───────────────────────────────────────────────────────────────────
const ReportView = ({ results, ranOutOfCredits, onPracticeWeak, onRetake, onDone }) => {
  const { graded, overall, strengths, gaps, drill } = useMemo(
    () => buildReport(results),
    [results]
  );
  const [openIdx, setOpenIdx] = useState(null);

  if (graded.length === 0) {
    return (
      <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-10 shadow-2xl text-center">
        <h1 className="text-xl font-bold">No answers graded</h1>
        <p className="text-sm text-slate-600 mt-2 mb-5">
          You skipped every question{ranOutOfCredits ? ' or ran out of credits' : ''}. Try again
          when you&apos;re ready.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
        >
          Back to prep
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white text-slate-900 rounded-2xl p-5 sm:p-8 shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
        <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
          <span className={`text-xl font-bold ${scoreTone(overall)}`}>{overall}%</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h1 className="text-lg sm:text-xl font-bold">Mock interview report</h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {graded.length} answer{graded.length === 1 ? '' : 's'} graded · {overall}% average
          </p>
        </div>
      </div>

      {ranOutOfCredits && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          You ran out of credits mid-session — this report covers the answers graded so far. Watch
          an ad on the prep page to earn more.
        </div>
      )}

      {/* Strengths / gaps */}
      {(strengths.length > 0 || gaps.length > 0) && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 mb-1.5">
              Strengths
            </p>
            {strengths.length ? (
              <ul className="text-xs text-slate-700 space-y-0.5">
                {strengths.map((d) => (
                  <li key={d} className="capitalize">
                    ✓ {d} — consistently covered
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">
                Keep practicing to build consistent strengths.
              </p>
            )}
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-rose-700 mb-1.5">
              Work on
            </p>
            {gaps.length ? (
              <ul className="text-xs text-slate-700 space-y-0.5">
                {gaps.map((d) => (
                  <li key={d} className="capitalize">
                    • {d} — often missing or thin
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">Nice — every STAR part showed up reliably.</p>
            )}
          </div>
        </div>
      )}

      {/* Drill these */}
      {drill.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5">
            Drill these next
          </p>
          <ul className="space-y-1">
            {drill.map((r, i) => (
              <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                <span
                  className={`shrink-0 inline-flex items-center justify-center min-w-7 h-5 px-1 rounded text-[10px] font-bold ${scoreBg(r.score)}`}
                >
                  {r.score}
                </span>
                <span>{r.question}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Per-question breakdown */}
      <div className="mt-5">
        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">
          Per-question
        </p>
        <div className="space-y-2">
          {graded.map((r, i) => {
            const open = openIdx === i;
            return (
              <div key={i} className="border border-slate-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenIdx(open ? null : i)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50"
                >
                  <span
                    className={`shrink-0 inline-flex items-center justify-center w-9 h-7 rounded text-xs font-bold ${scoreBg(r.score)}`}
                  >
                    {r.score}
                  </span>
                  <span className="flex-1 min-w-0 text-sm font-medium text-slate-800 truncate">
                    {r.question}
                  </span>
                  {open ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                {open && (
                  <div className="px-3 pb-3 pt-1 border-t border-slate-100 bg-slate-50/30 space-y-3">
                    {r.overallFeedback && (
                      <p className="text-xs text-slate-700 leading-relaxed">{r.overallFeedback}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {STAR_DIMS.map((d) => {
                        const ok = r.starBreakdown?.[d]?.covered;
                        return (
                          <span
                            key={d}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                              ok ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {ok && <Check className="w-3 h-3" />}
                            {d}
                          </span>
                        );
                      })}
                    </div>
                    {r.refinedAnswer && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 mb-1">
                          Polished version
                        </p>
                        <p className="text-xs text-slate-700 italic bg-indigo-50/40 border border-indigo-100 rounded-lg p-2.5 whitespace-pre-line">
                          {r.refinedAnswer}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CTAs */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onPracticeWeak}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
        >
          <PlayCircle className="w-4 h-4" /> Practice weak spots
        </button>
        <button
          type="button"
          onClick={onRetake}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" /> Retake
        </button>
        <button
          type="button"
          onClick={onDone}
          className="sm:ml-auto px-4 py-2.5 rounded-lg text-slate-600 text-sm font-semibold hover:bg-slate-50"
        >
          Back to prep
        </button>
      </div>
    </div>
  );
};

export default MockInterviewPage;
