import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  EyeOff,
  Mic,
  MicOff,
  Send,
  Sparkles,
  RefreshCw,
  Play,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import InterviewPrepService from '../../services/interviewPrep.service';

// eslint-disable-next-line react-refresh/only-export-components
export const CONFIDENCE_OPTIONS = [
  {
    id: 'needs_work',
    label: 'Needs work',
    classes: 'border-rose-200 text-rose-700 hover:bg-rose-50',
    activeClasses: 'bg-rose-50 border-rose-350 border-rose-450 text-rose-800',
  },
  {
    id: 'almost',
    label: 'Almost there',
    classes: 'border-amber-200 text-amber-700 hover:bg-amber-50',
    activeClasses: 'bg-amber-50 border-amber-350 border-amber-450 text-amber-800',
  },
  {
    id: 'ready',
    label: 'Ready',
    classes: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
    activeClasses: 'bg-emerald-50 border-emerald-350 border-emerald-450 text-emerald-800',
  },
];

const PracticeRunner = ({
  applicationId,
  cards,
  confidenceById = {},
  onMarkConfidence,
  initialIndex = 0,
}) => {
  const [index, setIndex] = useState(initialIndex);
  const [showAnswer, setShowAnswer] = useState(false);
  const [mode, setMode] = useState('flashcard'); // 'flashcard' | 'ai-mock'
  const [userAnswer, setUserAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [grading, setGrading] = useState(false);
  const [gradeReport, setGradeReport] = useState(null);
  const [feedbackTab, setFeedbackTab] = useState('coaching'); // 'coaching' | 'refined' | 'ideal' | 'yours'
  const [expandedStarSection, setExpandedStarSection] = useState(null);

  // Synchronously reset page/question state when card index changes.
  const [lastIndex, setLastIndex] = useState(initialIndex);
  if (lastIndex !== index) {
    setLastIndex(index);
    setShowAnswer(false);
    setUserAnswer('');
    setIsRecording(false);
    setGradeReport(null);
    setFeedbackTab('coaching');
    setExpandedStarSection(null);
  }

  // Setup Web Speech API for voice dictation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechReg = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechReg) {
        const rec = new SpeechReg();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';
        setRecognition(rec);
      }
    }
  }, []);

  if (!Array.isArray(cards) || cards.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-sm">No practice cards available.</p>
      </div>
    );
  }

  const total = cards.length;
  const safeIndex = Math.min(Math.max(index, 0), total - 1);
  const card = cards[safeIndex];
  const activeConfidence = confidenceById[card.id] || card.confidence;

  // Attempt history for this card — prefer the freshly graded list (includes the
  // attempt just submitted), else the attempts loaded with the card.
  const attemptHistory =
    (gradeReport?.attempts?.length ? gradeReport.attempts : card.attempts) || [];
  const bestScore = attemptHistory.length
    ? Math.max(...attemptHistory.map((a) => a.score || 0))
    : null;
  const isNewBest = !!gradeReport && attemptHistory.length > 1 && gradeReport.score >= bestScore;

  const toggleRecording = () => {
    if (!recognition) {
      toast.error(
        'Speech recognition is not supported in this browser. Please type your response.'
      );
      return;
    }
    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      recognition.onstart = () => {
        setIsRecording(true);
      };
      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setUserAnswer((prev) => {
          const spaced = prev ? (prev.endsWith(' ') ? prev : prev + ' ') : '';
          return spaced + transcript;
        });
      };
      recognition.onerror = (e) => {
        console.error('Speech recognition error:', e);
        setIsRecording(false);
      };
      recognition.onend = () => {
        setIsRecording(false);
      };
      recognition.start();
    }
  };

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) {
      toast.error('Please dictate or type an answer first.');
      return;
    }
    setGrading(true);
    setGradeReport(null);
    try {
      const dbIndex =
        card.index !== undefined ? card.index : parseInt(card.id.replace(/^q:/, ''), 10);
      const res = await InterviewPrepService.gradeAnswer(
        applicationId,
        card.prompt,
        dbIndex,
        userAnswer
      );
      setGradeReport(res);
      // Automatically update confidence level locally and parent state
      if (onMarkConfidence) {
        onMarkConfidence(card, res.confidence);
      }
      toast.success(`Answer Graded! Score: ${res.score}/100`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to grade your answer.');
    } finally {
      setGrading(false);
    }
  };

  // SVGs score dial configurations
  const radius = 35;
  const stroke = 5;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  // Clamp + round the AI score, then translate it into the dial's stroke
  // offset. Without this `strokeDashoffset` the grade report crashes
  // (ReferenceError) the moment it renders after a graded answer.
  const scorePct = Math.max(0, Math.min(100, Math.round(gradeReport?.score ?? 0)));
  const strokeDashoffset = circumference - (scorePct / 100) * circumference;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Upper Navigation & Mode Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div>
          <p className="text-xs uppercase tracking-wider font-bold text-slate-400">
            {card.kind === 'skill'
              ? 'Skill talking point'
              : card.kind === 'story'
                ? 'Your STAR story'
                : card.type || 'Question'}
          </p>
          <h2 className="text-sm font-medium text-slate-500 mt-0.5">
            Card {safeIndex + 1} of {total}
          </h2>
        </div>

        {/* Mode Switcher Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg shrink-0 w-fit self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode('flashcard')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              mode === 'flashcard'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Flashcard Mode
          </button>
          <button
            type="button"
            onClick={() => setMode('ai-mock')}
            disabled={card.kind !== 'question'}
            title={
              card.kind !== 'question' ? 'AI grading is only available for job questions.' : ''
            }
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              mode === 'ai-mock'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            AI Mock Interview
          </button>
        </div>
      </div>

      {/* Progress indicators */}
      <div className="flex items-center gap-1.5 mb-6">
        {cards.map((c, i) => (
          <span
            key={c.id}
            className={`h-1.5 rounded-full transition-all ${
              i === safeIndex ? 'flex-1 bg-indigo-600' : 'w-6 bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* QUESTION CARD */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 sm:p-8 mb-6 shadow-sm">
        <p className="text-base sm:text-lg font-semibold text-slate-900 leading-snug">
          {card.prompt}
        </p>
      </div>

      {/* MODE 1: FLASHCARD REVIEW — also the only mode for non-question cards
          (skills / stories), regardless of the toggle's last state. */}
      {(mode === 'flashcard' || card.kind !== 'question') && (
        <div className="space-y-6">
          <div className="min-h-48 rounded-xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col justify-between shadow-sm">
            {showAnswer ? (
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-3">
                  {card.kind === 'skill'
                    ? 'Suggested talking point'
                    : card.kind === 'story'
                      ? 'Your STAR story'
                      : 'Suggested answer'}
                </p>
                <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
                  {card.suggestedAnswer || 'No suggested answer available.'}
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 py-6">
                <EyeOff className="w-8 h-8 mb-3 text-slate-300 animate-pulse" />
                <p className="text-sm font-semibold text-slate-800">Answer out loud</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Formulate and practice your answer verbally before revealing the suggested
                  coaching notes.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIndex(Math.max(safeIndex - 1, 0))}
                disabled={safeIndex === 0}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setIndex(Math.min(safeIndex + 1, total - 1))}
                disabled={safeIndex === total - 1}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
              <button
                type="button"
                onClick={() => setShowAnswer((v) => !v)}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs sm:text-sm font-semibold hover:bg-indigo-700"
              >
                {showAnswer ? 'Hide answer' : 'Reveal answer'}
              </button>
            </div>

            {/* Readiness rating — for questions & stories, not reference skills. */}
            {card.kind !== 'skill' && (
              <div className="lg:ml-auto flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-bold mr-1.5">Rate readiness:</span>
                {CONFIDENCE_OPTIONS.map((option) => {
                  const active = activeConfidence === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => onMarkConfidence?.(card, option.id)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                        active ? option.activeClasses : option.classes
                      }`}
                    >
                      {active ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <Circle className="w-3.5 h-3.5" />
                      )}
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: INTERACTIVE AI MOCK INTERVIEWER — job questions only. */}
      {mode === 'ai-mock' && card.kind === 'question' && (
        <div className="space-y-6">
          {/* Attempt history strip — best score + recent attempts. */}
          {attemptHistory.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Best {bestScore}%
              </span>
              <span className="text-[11px] text-slate-400">
                · {attemptHistory.length} attempt{attemptHistory.length === 1 ? '' : 's'}
              </span>
              {isNewBest && (
                <span className="text-[11px] font-bold text-emerald-600">New best! 🎉</span>
              )}
              <div className="ml-auto flex items-center gap-1">
                {attemptHistory.slice(-6).map((a, i) => (
                  <span
                    key={i}
                    title={a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}
                    className={`inline-flex items-center justify-center min-w-7 h-6 px-1 rounded text-[10px] font-bold ${
                      a.score > 75
                        ? 'bg-emerald-100 text-emerald-700'
                        : a.score > 45
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {a.score}
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* Main Interview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Interviewer stream (Video simulation frame) */}
            <div className="md:col-span-5 bg-slate-900 border border-slate-800 rounded-xl aspect-[4/3] flex flex-col justify-between p-4 relative overflow-hidden shadow-lg group">
              {/* Call Status Badge */}
              <div className="absolute top-3 left-3 bg-slate-800/80 backdrop-blur text-white text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded border border-slate-700/50 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                Live Coach
              </div>

              {/* Central Interviewer Profile Aura */}
              <div className="flex-1 flex flex-col items-center justify-center">
                <div
                  className={`w-20 h-20 rounded-full bg-indigo-500/10 border-2 border-indigo-500/40 flex items-center justify-center transition-all ${
                    isRecording
                      ? 'animate-pulse scale-105 border-pink-500/40 bg-pink-500/5'
                      : grading
                        ? 'animate-spin border-dashed border-indigo-400'
                        : ''
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-full bg-gradient-to-tr ${
                      isRecording ? 'from-pink-500 to-rose-450' : 'from-indigo-650 to-indigo-500'
                    } text-white flex items-center justify-center font-bold text-lg shadow-inner`}
                  >
                    AR
                  </div>
                </div>
                <h3 className="text-slate-250 text-xs font-semibold mt-3 text-center">
                  AI Hiring Coach
                </h3>
                <p className="text-slate-500 text-[10px] text-center mt-0.5">
                  {grading ? 'Analyzing response...' : isRecording ? 'Listening...' : 'Ready'}
                </p>
              </div>

              {/* Captions / Coach Prompts */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/35 rounded-lg p-2.5 text-[11px] text-slate-300 text-center leading-relaxed">
                {grading
                  ? 'Great response. Give me a moment to grade your answer structure.'
                  : isRecording
                    ? 'I am listening... Take your time to articulate your thoughts.'
                    : 'Whenever you are ready, dictating or typing your answer below.'}
              </div>
            </div>

            {/* Answer Input Panel */}
            <div className="md:col-span-7 flex flex-col gap-3">
              <div className="flex-1 min-h-60 border border-slate-200 bg-white rounded-xl shadow-sm flex flex-col overflow-hidden relative">
                <textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Record or write your response here... Try to detail the Situation, Task, Action, and Result."
                  className="w-full flex-1 p-4 text-xs sm:text-sm text-slate-700 placeholder-slate-400 border-none resize-none focus:outline-none focus:ring-0 leading-relaxed"
                />

                {/* Pulsating Voice indicator inside textarea */}
                {isRecording && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-pink-50 text-pink-700 text-[10px] font-bold border border-pink-200 px-2 py-0.5 rounded-full animate-bounce">
                    <span className="w-1.5 h-1.5 bg-pink-600 rounded-full animate-ping" />
                    Recording
                  </div>
                )}

                {/* Bottom Textarea Tray */}
                <div className="bg-slate-50/70 border-t border-slate-100 p-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleRecording}
                      className={`p-2 rounded-lg transition-all shadow-sm ${
                        isRecording
                          ? 'bg-pink-650 hover:bg-pink-755 text-white ring-2 ring-pink-500/25'
                          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                      }`}
                      title={isRecording ? 'Stop Recording' : 'Start Voice Dictation'}
                    >
                      {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                    {userAnswer && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Clear your answer and start over?')) {
                            setUserAnswer('');
                          }
                        }}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Clear Answer"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {userAnswer.length} chars
                  </span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="button"
                onClick={handleSubmitAnswer}
                disabled={grading || !userAnswer.trim()}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-755 text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
              >
                {grading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    AI Coach is grading (1 credit)...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit to AI Coach
                    <span className="inline-flex items-center gap-0.5 ml-1.5 bg-indigo-500 text-indigo-50 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                      1 Credit
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI GRADE REPORT CONTAINER */}
          {gradeReport && (
            <div className="border border-indigo-150 bg-indigo-50/5 rounded-xl p-5 sm:p-6 shadow-md border-t-4 border-t-indigo-600">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  {/* Gauge Progress SVG */}
                  <div className="relative flex items-center justify-center shrink-0 w-16 h-16">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        stroke="#e2e8f0"
                        fill="transparent"
                        strokeWidth={stroke}
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                      />
                      <circle
                        stroke={
                          gradeReport.score > 75
                            ? '#10b981'
                            : gradeReport.score > 45
                              ? '#f59e0b'
                              : '#ef4444'
                        }
                        fill="transparent"
                        strokeWidth={stroke}
                        strokeDasharray={circumference + ' ' + circumference}
                        style={{ strokeDashoffset }}
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-sm font-bold text-slate-800">{scorePct}%</span>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Evaluation Report</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Graded using strict STAR recruiter metrics.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    Rating Status:
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      gradeReport.score > 75
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-250'
                        : gradeReport.score > 45
                          ? 'bg-amber-50 text-amber-700 border border-amber-250'
                          : 'bg-rose-50 text-rose-700 border border-rose-250'
                    }`}
                  >
                    {gradeReport.confidence?.replace('_', ' ') || 'needs work'}
                  </span>
                </div>
              </div>

              {/* STAR Checklist accordions */}
              <div className="mt-5">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-3">
                  STAR Metrics Breakdown
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  {Object.entries(gradeReport.starBreakdown || {}).map(([key, data]) => {
                    const isExpanded = expandedStarSection === key;
                    return (
                      <div
                        key={key}
                        className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm"
                      >
                        <div
                          onClick={() => setExpandedStarSection(isExpanded ? null : key)}
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-all select-none"
                        >
                          <div className="flex items-center gap-2">
                            {data.covered ? (
                              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                <Check className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                                <span className="w-1.5 h-1.5 bg-slate-350 rounded-full" />
                              </div>
                            )}
                            <span className="text-xs font-bold text-slate-800 uppercase shrink-0">
                              {key}
                            </span>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        {isExpanded && (
                          <div className="p-3 pt-0 border-t border-slate-100 text-xs text-slate-650 leading-relaxed bg-slate-50/20">
                            {data.feedback}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Feedbacks detailed (Tabs) */}
              <div className="mt-5 border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
                <div className="flex border-b border-slate-150 bg-slate-50 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setFeedbackTab('coaching')}
                    className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors border-r border-slate-200 ${
                      feedbackTab === 'coaching'
                        ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-650'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Coaching Feedback
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackTab('refined')}
                    className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors border-r border-slate-200 ${
                      feedbackTab === 'refined'
                        ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-650'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Refined Rewrite
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackTab('ideal')}
                    className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors border-r border-slate-200 ${
                      feedbackTab === 'ideal'
                        ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-650'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Ideal Answer
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackTab('yours')}
                    className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors ${
                      feedbackTab === 'yours'
                        ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-650'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Your Answer
                  </button>
                </div>

                <div className="p-4 min-h-32 text-xs sm:text-sm text-slate-755 leading-relaxed bg-white">
                  {feedbackTab === 'coaching' && (
                    <div className="space-y-2">
                      <p className="font-bold text-slate-900">Coaching Notes:</p>
                      <p className="whitespace-pre-line">{gradeReport.overallFeedback}</p>
                    </div>
                  )}
                  {feedbackTab === 'refined' && (
                    <div className="space-y-2">
                      <p className="font-bold text-indigo-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-650" /> Refined Version (read this
                        out loud):
                      </p>
                      <p className="whitespace-pre-line text-slate-800 italic bg-indigo-50/20 border border-indigo-100 rounded-lg p-3">
                        "{gradeReport.refinedAnswer}"
                      </p>
                    </div>
                  )}
                  {feedbackTab === 'ideal' && (
                    <div className="space-y-2">
                      <p className="font-bold text-slate-900">Recruiter Suggested Ideal Answer:</p>
                      <p className="whitespace-pre-line bg-slate-50 rounded-lg p-3">
                        {card.suggestedAnswer || 'No ideal answer available.'}
                      </p>
                    </div>
                  )}
                  {feedbackTab === 'yours' && (
                    <div className="space-y-2">
                      <p className="font-bold text-slate-900">Your Transcribed Response:</p>
                      <p className="whitespace-pre-line bg-slate-50 rounded-lg p-3 text-slate-650">
                        {userAnswer}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Control Buttons Footer */}
      <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIndex(Math.max(safeIndex - 1, 0))}
            disabled={safeIndex === 0}
            className="px-4 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Previous Question
          </button>
          <button
            type="button"
            onClick={() => setIndex(Math.min(safeIndex + 1, total - 1))}
            disabled={safeIndex === total - 1}
            className="px-4 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Next Question
          </button>
        </div>
      </div>
    </div>
  );
};

export default PracticeRunner;
