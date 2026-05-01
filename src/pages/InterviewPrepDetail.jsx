import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ChevronDown,
  MessageSquare,
  Sparkles,
  BookOpen,
  Eye,
  Briefcase,
  Check,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '../components/Navbar';
import InterviewPrepService from '../services/interviewPrep.service';
import { useMinVisible } from '../hooks/useMinVisible';

const InterviewPrepDetail = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState('');
  const [savedHint, setSavedHint] = useState(false);
  const [savingSkills, setSavingSkills] = useState(false);
  const showLoader = useMinVisible(loading, 800);
  const noteSaveTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { application: app } = await InterviewPrepService.getOne(applicationId);
        if (cancelled) return;
        setApplication(app);
        setNotes(app?.interviewPrep?.userNotes || '');
      } catch (e) {
        if (!cancelled)
          setError(e.response?.data?.message || 'Failed to load interview prep');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  const persistNotes = async (text) => {
    try {
      await InterviewPrepService.updateNotes(applicationId, text);
      setSavedHint(true);
      if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current);
      noteSaveTimer.current = setTimeout(() => setSavedHint(false), 1800);
    } catch (e) {
      console.error('Failed to save notes', e);
    }
  };

  const handleSaveSkills = async () => {
    setSavingSkills(true);
    try {
      // Server pulls skill metadata from the linked DraftCV — no need to send
      // skillsWithEvidence from the client.
      await InterviewPrepService.saveSkills(applicationId);
      const { application: app } = await InterviewPrepService.getOne(applicationId);
      setApplication(app);
      toast.success('Skill talking points saved');
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to save skill prep';
      toast.error(msg);
    } finally {
      setSavingSkills(false);
    }
  };

  if (showLoader) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="text-center py-12 text-rose-600">{error}</div>
      </div>
    );
  }

  if (!application) return null;

  const prep = application.interviewPrep || {};
  const job = application.jobId || {};
  const isCvOnly = application.source === 'draft' || (!application.jobId && !application.jobTitle);
  const title = job.title || application.jobTitle || (isCvOnly ? 'CV draft' : 'Untitled role');
  const company = job.company || application.jobCompany || '';
  const jobQuestions = prep.jobQuestions || [];
  const skillsWithEvidence = prep.skillsWithEvidence || [];
  const questionsToAsk = prep.questionsToAsk || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      {/* Context header — single compact row: back · title · badge · CTA. The
          subtitle for CV-only prep tucks under the title row at small text so
          it doesn't dominate the chrome. */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate('/interview-prep')}
              className="p-1.5 -ml-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors shrink-0"
              aria-label="Back to list"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                  {title}
                </h1>
                {company && (
                  <span className="hidden sm:inline text-sm text-slate-400 shrink-0">·</span>
                )}
                {company && (
                  <span className="hidden sm:inline text-sm text-slate-500 truncate">
                    {company}
                  </span>
                )}
                <span
                  className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                    isCvOnly
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-indigo-50 text-indigo-700'
                  }`}
                >
                  {isCvOnly ? 'From CV' : 'Job role'}
                </span>
              </div>
              {company && (
                <p className="sm:hidden text-xs text-slate-500 truncate mt-0.5">
                  {company}
                </p>
              )}
              {isCvOnly && (
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  Not attached to a job yet
                </p>
              )}
            </div>

            <Link
              to={
                !isCvOnly
                  ? `/resume/${application._id}`
                  : application.draftCVId
                    ? `/cv-builder/${application.draftCVId}/skills`
                    : '#'
              }
              className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
              aria-label={isCvOnly ? 'Open CV' : 'View CV'}
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">{isCvOnly ? 'Open CV' : 'View CV'}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        {/* Two-column on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Job-based prep */}
          {jobQuestions.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
              <SectionHeader
                icon={MessageSquare}
                title="Job-based prep"
                subtitle={`${jobQuestions.length} likely question${jobQuestions.length === 1 ? '' : 's'} with rehearsable answers`}
                iconBg="bg-indigo-50"
                iconColor="text-indigo-600"
              />
              <div className="mt-4 space-y-2">
                {jobQuestions.map((q, i) => (
                  <Accordion
                    key={i}
                    title={q.question}
                    type={q.type}
                  >
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {q.suggestedAnswer || 'No suggested answer available.'}
                    </p>
                  </Accordion>
                ))}
              </div>

              {questionsToAsk.length > 0 && (
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-emerald-600" />
                    Questions to ask the interviewer
                  </h4>
                  <ul className="space-y-2">
                    {questionsToAsk.map((q, i) => (
                      <li
                        key={i}
                        className="text-sm text-slate-700 leading-relaxed pl-3 border-l-2 border-emerald-200"
                      >
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Skill-based prep */}
          {skillsWithEvidence.length === 0 ? (
            <section className="bg-white border border-dashed border-slate-200 rounded-xl p-5 sm:p-6">
              <SectionHeader
                icon={Sparkles}
                title="Skill-based prep"
                subtitle="Pull rehearsable talking points from your CV's skills"
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
              />
              <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                Auto-generated skills on this CV come with evidence (where they came from in
                your work / education / projects) and talking points you can read aloud in
                an interview. Save them here for quick access.
              </p>
              {isCvOnly && application.draftCVId ? (
                <Link
                  to={`/cv-builder/${application.draftCVId}/skills`}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
                >
                  <Eye className="w-4 h-4" /> Open CV builder
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveSkills}
                  disabled={savingSkills}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                >
                  {savingSkills ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" /> Save from CV
                    </>
                  )}
                </button>
              )}
            </section>
          ) : (
            <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <SectionHeader
                  icon={Sparkles}
                  title="Skill-based prep"
                  subtitle={`${skillsWithEvidence.length} skill${skillsWithEvidence.length === 1 ? '' : 's'} with evidence + talking points`}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                />
                {!isCvOnly && (
                  <button
                    type="button"
                    onClick={handleSaveSkills}
                    disabled={savingSkills}
                    className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                    title="Re-pull skill metadata from your latest CV"
                  >
                    {savingSkills ? (
                      <div className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    Refresh
                  </button>
                )}
              </div>
              <div className="mt-4 space-y-2">
                {skillsWithEvidence.map((s, i) => (
                  <Accordion key={i} title={s.name} type={s.category}>
                    {s.evidence?.length > 0 && (
                      <div className="space-y-2 mb-3">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                          Where this came from
                        </p>
                        {s.evidence.map((ev, k) => {
                          const palette =
                            ev.type === 'project'
                              ? 'bg-emerald-50 text-emerald-700'
                              : ev.type === 'education'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-indigo-50 text-indigo-700';
                          return (
                            <div key={k} className="flex gap-2">
                              <span
                                className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider h-fit ${palette}`}
                              >
                                {ev.type}
                              </span>
                              <p className="text-sm text-slate-700 leading-relaxed">
                                {ev.snippet}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {s.talkingPoint && (
                      <div className="pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                            Talking point
                          </p>
                        </div>
                        <p className="text-sm italic text-slate-600 leading-relaxed">
                          "{s.talkingPoint}"
                        </p>
                      </div>
                    )}
                  </Accordion>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* My Notes */}
        <section className="mt-6 bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-900">My notes</h3>
            <AnimatePresence>
              {savedHint && (
                <motion.span
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium"
                >
                  <Check className="w-3 h-3" /> Saved
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => persistNotes(notes)}
            rows={5}
            placeholder="Jot down anything you want to remember — questions to research, things to practice, follow-ups..."
            className="w-full text-sm text-slate-800 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 placeholder-slate-400 resize-none"
          />
        </section>
      </main>
    </div>
  );
};

const SectionHeader = ({ icon: Icon, title, subtitle, iconBg, iconColor }) => (
  <div className="flex items-start gap-3">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="min-w-0">
      <h2 className="text-base sm:text-lg font-bold text-slate-900">{title}</h2>
      <p className="text-xs sm:text-sm text-slate-500">{subtitle}</p>
    </div>
  </div>
);

const Accordion = ({ title, type, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-start gap-3 p-3 sm:p-4 text-left hover:bg-slate-50 transition-colors min-h-12"
      >
        <div className="flex-1 min-w-0">
          {type && (
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">
              {type}
            </p>
          )}
          <p className="text-sm font-semibold text-slate-900 leading-tight">{title}</p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 mt-0.5 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-slate-100 pt-3 border-l-2 border-l-indigo-200 ml-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InterviewPrepDetail;
