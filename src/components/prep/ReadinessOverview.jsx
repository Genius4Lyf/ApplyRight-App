import React from 'react';
import { Target, PlayCircle, ArrowRight, CheckCircle2, Sparkles, Loader } from 'lucide-react';
import { computeReadiness, getJobQuestions } from '../../utils/interviewPrep';

// Small SVG score ring. Color tracks the score band.
const ScoreRing = ({ score }) => {
  const radius = 30;
  const stroke = 6;
  const r = radius - stroke;
  const circumference = r * 2 * Math.PI;
  const pct = Math.max(0, Math.min(100, score));
  const offset = circumference - (pct / 100) * circumference;
  const color = score >= 75 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444';

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: 64, height: 64 }}
    >
      <svg width="64" height="64" className="-rotate-90">
        <circle stroke="#e2e8f0" fill="transparent" strokeWidth={stroke} r={r} cx="32" cy="32" />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          r={r}
          cx="32"
          cy="32"
        />
      </svg>
      <span className="absolute text-sm font-bold text-slate-800">{pct}%</span>
    </div>
  );
};

const Chip = ({ label, count, tone }) => {
  if (!count) return null;
  const tones = {
    ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    almost: 'bg-amber-50 text-amber-700 border-amber-200',
    needs_work: 'bg-rose-50 text-rose-700 border-rose-200',
    unrated: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-semibold ${tones[tone]}`}
    >
      {count} {label}
    </span>
  );
};

// Persistent "where do I stand" card shown above the prep tabs. Reads only data
// already on the prep (no API calls).
const ReadinessOverview = ({
  application,
  onPracticeWeak,
  onGoToTab,
  onGenerateEssential,
  generatingEssential,
  onDraftWeakness,
}) => {
  const { total, rated, counts, score, weakQuestionIndices, nextAction } =
    computeReadiness(application);

  const isReady = nextAction.kind === 'done';
  const hasWeakQuestions = weakQuestionIndices.length > 0;

  const handleNextAction = () => {
    switch (nextAction.kind) {
      case 'generate':
        onGoToTab?.('stories');
        break;
      case 'rate':
      case 'revisit':
        if (hasWeakQuestions) onPracticeWeak?.();
        break;
      case 'verify':
        onGoToTab?.('questions');
        break;
      default:
        break;
    }
  };

  // Compute essentials status
  const jobQuestions = getJobQuestions(application);
  const notes = Array.isArray(application.interviewPrep?.userNotes)
    ? application.interviewPrep.userNotes
    : [];

  const introQ = jobQuestions.find((q) => (q.type || '').toLowerCase() === 'intro');
  const motivationQ = jobQuestions.find((q) => (q.type || '').toLowerCase() === 'motivation');
  const hasGapNote = notes.some(
    (n) =>
      n.title?.toLowerCase().includes('weakness') ||
      n.title?.toLowerCase().includes('growth area') ||
      (n.body && n.body.toLowerCase().includes('weakness'))
  );

  const introStatus = !introQ ? 'empty' : introQ.confidence === 'ready' ? 'ready' : 'rehearsing';
  const motivationStatus = !motivationQ ? 'empty' : motivationQ.confidence === 'ready' ? 'ready' : 'rehearsing';
  const gapStatus = hasGapNote ? 'ready' : 'empty';

  const allEssentialsReady = introStatus === 'ready' && motivationStatus === 'ready' && gapStatus === 'ready';

  return (
    <section
      className={`rounded-xl border p-4 sm:p-5 flex flex-col justify-between h-full hover:shadow-md hover:border-slate-350 transition-all duration-300 ${
        isReady ? 'bg-emerald-50/40 border-emerald-200' : 'bg-white border-slate-200'
      }`}
    >
      <div>
        <div className="flex items-center gap-4">
          <ScoreRing score={score} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-600 shrink-0" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Interview readiness</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {total === 0
                ? 'No prep to score yet.'
                : `${rated} of ${total} item${total === 1 ? '' : 's'} rated`}
            </p>
            {total > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <Chip label="ready" count={counts.ready} tone="ready" />
                <Chip label="almost" count={counts.almost} tone="almost" />
                <Chip label="needs work" count={counts.needs_work} tone="needs_work" />
                <Chip label="not rated" count={counts.unrated} tone="unrated" />
              </div>
            )}
          </div>
        </div>

        {/* Essentials checklist */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Essential prep checklist
            </h3>
            {!allEssentialsReady && (
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200/60 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                Action required
              </span>
            )}
          </div>
          <ul className="space-y-2.5">
            {/* Tell me about yourself */}
            <li className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0">
                  {introStatus === 'ready' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : introStatus === 'rehearsing' ? (
                    <div className="w-4 h-4 rounded-full border border-amber-300 bg-amber-50 flex items-center justify-center text-[10px] font-bold text-amber-655" title="Needs review & practice">!</div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400" title="Not generated">?</div>
                  )}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-700">Elevator Pitch (&ldquo;Tell me about yourself&rdquo;)</p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {introStatus === 'ready'
                      ? 'Ready to impress'
                      : introStatus === 'rehearsing'
                        ? 'Generated, needs practice & ready mark'
                        : 'Essential introduction pitch is missing'}
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                {generatingEssential === 'intro' ? (
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium"><Loader className="w-3.5 h-3.5 animate-spin text-indigo-600" /> Writing…</span>
                ) : introStatus === 'ready' ? (
                  <span className="text-[11px] text-emerald-600 font-bold">Ready</span>
                ) : introStatus === 'rehearsing' ? (
                  <button
                    type="button"
                    onClick={() => onGoToTab?.('questions')}
                    className="text-[11px] font-semibold text-indigo-650 hover:text-indigo-800"
                  >
                    Practice
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onGenerateEssential?.('intro')}
                    className="text-[11px] font-semibold text-indigo-650 hover:text-indigo-800"
                  >
                    Generate
                  </button>
                )}
              </div>
            </li>

            {/* Why this role */}
            <li className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0">
                  {motivationStatus === 'ready' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : motivationStatus === 'rehearsing' ? (
                    <div className="w-4 h-4 rounded-full border border-amber-300 bg-amber-50 flex items-center justify-center text-[10px] font-bold text-amber-655" title="Needs review & practice">!</div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400" title="Not generated">?</div>
                  )}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-700">Company Motivation (&ldquo;Why this role?&rdquo;)</p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {motivationStatus === 'ready'
                      ? 'Ready to impress'
                      : motivationStatus === 'rehearsing'
                        ? 'Generated, needs practice & ready mark'
                        : 'Essential motivation response is missing'}
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                {generatingEssential === 'motivation' ? (
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium"><Loader className="w-3.5 h-3.5 animate-spin text-indigo-600" /> Writing…</span>
                ) : motivationStatus === 'ready' ? (
                  <span className="text-[11px] text-emerald-600 font-bold">Ready</span>
                ) : motivationStatus === 'rehearsing' ? (
                  <button
                    type="button"
                    onClick={() => onGoToTab?.('questions')}
                    className="text-[11px] font-semibold text-indigo-650 hover:text-indigo-800"
                  >
                    Practice
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onGenerateEssential?.('motivation')}
                    className="text-[11px] font-semibold text-indigo-650 hover:text-indigo-800"
                  >
                    Generate
                  </button>
                )}
              </div>
            </li>

            {/* Growth area / weakness */}
            <li className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0">
                  {gapStatus === 'ready' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400" title="Not drafted">?</div>
                  )}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-700">Growth Area (&ldquo;Biggest weakness?&rdquo;)</p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {gapStatus === 'ready'
                      ? 'Drafted in My notes'
                      : 'Strategy and talking points not drafted yet'}
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                {gapStatus === 'ready' ? (
                  <span className="text-[11px] text-emerald-600 font-bold">Drafted</span>
                ) : (
                  <button
                    type="button"
                    onClick={onDraftWeakness}
                    className="text-[11px] font-semibold text-indigo-650 hover:text-indigo-800"
                  >
                    Draft
                  </button>
                )}
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Next best action */}
      <div className="mt-5 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          {isReady ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
          )}
          <span className={`font-semibold ${isReady ? 'text-emerald-800' : 'text-slate-700'}`}>
            {nextAction.label}
          </span>
        </div>
      </div>
    </section>
  );
};

export default ReadinessOverview;
