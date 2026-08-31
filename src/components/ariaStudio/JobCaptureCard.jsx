import React, { useRef, useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AriaCard from './AriaCard';
import AriaThinking from '../cv/AriaThinking';
import AriaOrbit from '../cv/AriaOrbit';
import CVService from '../../services/cv.service';
import { costForActionTier } from '../../lib/models';
import { SPRING_CARD } from '../../lib/ariaMotion';
import { Link2, ExternalLink, MapPin, Banknote, Briefcase, CalendarDays } from 'lucide-react';

// The job comes from an inline role+description FORM Aria conjures — not the chat
// textarea. Mirrors the CV Builder's TargetChat form (ATSCoachPanel's TargetChat):
// same fields, same 25-char JD floor.
//
// Capture only: onSubmit({ jobTitle, jobDescription, jdSource, jobId }) hands off
// immediately and the caller owns the "reading the job" beat, so the keyword read and the
// Role Brief resolve together under ONE indicator instead of two sequential waits.
//
// ── THREE VIEWS ──
//
// `allowLink` adds the paste-a-URL path (prep sessions use it), and with it two more
// faces. Pasting a link is not "filling in a field": it is asking Aria to go and read
// something, and the card follows that through —
//
//   form     → the fields. The only view when there is no link path.
//   fetching → Aria reading the posting, orbit centred, fields gone. Nothing on them is
//              actionable while it runs, and leaving them up invites an edit that the
//              arriving result would silently overwrite.
//   summary  → what came back, as a RECORD rather than a form: role, company, what the
//              posting said about itself, the description. Edit returns to the fields.
//
// Same shape as RoleBriefCard's confirm step (✎ Edit on the left, the primary action on
// the right), because it is the same moment: here is what I understood, is it right?
//
// A LINK DOES NOT ALWAYS WORK, and the interesting design is what happens then. LinkedIn
// and most JS-rendered ATS pages either block a server outright or hand back a two-line
// summary; the server grades what it got and says so rather than passing a blurb off as
// the job. A partial read still reaches `summary` — we have real content to show, honestly
// labelled — while a blocked one drops back to `form`, because a summary view with nothing
// in it is just an error message wearing a card.
//
// `model` is the generation model id (genModelId in StudioChat). It's still passed to
// the draft call, but the backend now PINS Draft-JD to the Standard (light) model and
// ignores the client's pick — a generic role profile doesn't warrant a flagship charge. So
// the assist is always priced at the light DRAFT_JD cost, keeping the quote in step
// with what the server actually bills.

// The floor the SERVER uses to decide a description is the posting rather than a blurb.
// Kept in step deliberately: the guide exists because we don't have a full JD, so it
// should stop existing exactly when the server would agree that we do.
const FULL_JD_CHARS = 400;

// How long Aria's reading stays on screen AT MINIMUM, once it has started.
//
// A cached posting can come back in under 200ms, and at that speed the orbit appears and
// vanishes as a flicker — the card lurches from form to result with nothing in between,
// which reads as a glitch rather than as work being done. Holding the floor makes a fast
// read feel like a fast read instead of a jump cut. It only ever ADDS time to a request
// that already finished, so it costs nobody anything but the impression of a beat.
const MIN_READING_MS = 1100;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// One captured fact from the posting. Icon + value, no label — "Lagos" beside a pin does
// not need the word "Location".
//
// `Icon` is used only via <Icon /> in JSX; this eslint config lacks jsx-uses-vars so it
// reads as unused — the same false positive AriaCard suppresses for `motion`.
// eslint-disable-next-line no-unused-vars
const DetailChip = ({ icon: Icon, value }) =>
  value ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-[12px] text-slate-600 dark:border-slate-700 dark:text-slate-300">
      <Icon
        className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500"
        aria-hidden="true"
      />
      {value}
    </span>
  ) : null;

// "linkedin.com" — enough to say WHICH page is being read without printing a 200-character
// tracking URL into the card.
const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

const JobCaptureCard = ({
  initialTitle = '',
  initialDescription = '',
  model,
  allowLink = false,
  submitLabel,
  onSubmit,
  onCancel,
}) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  // The reading floor deliberately keeps this component alive past its own request, so
  // the resolve path has to know whether anyone is still looking.
  const aliveRef = useRef(true);
  // Set true on the way IN as well as false on the way out. A cleanup-only version is
  // wrong under StrictMode, which runs mount → cleanup → mount: the flag went false on
  // that first cleanup and nothing ever put it back, so every later read saw a component
  // that had "unmounted" and the reveal below silently returned instead of showing the
  // result. The card sat on Aria's reading forever.
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);
  const [roleInput, setRoleInput] = useState(initialTitle);
  const [jdInput, setJdInput] = useState(initialDescription);
  const [wasDrafted, setWasDrafted] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [linkError, setLinkError] = useState('');
  // 'form' | 'fetching' | 'summary' — see the note above.
  const [view, setView] = useState('form');
  // The Job the link produced, held ONLY while this form still matches it. Any edit to
  // the role or the description clears it, because a stale id would send the analysis
  // against the posting as scraped rather than the text now on screen.
  const [linkJob, setLinkJob] = useState(null);
  // Why the guide is showing: 'teaser' (we got a summary, not the posting) or 'blocked'
  // (nothing readable at all). null when the link worked or was never tried.
  const [linkGuide, setLinkGuide] = useState(null);
  // The URL we tried, so the guide can offer to open it. Kept separately from the input
  // because the input stays editable underneath.
  const [triedUrl, setTriedUrl] = useState('');
  // What the posting said about itself — salary, location, dates. Shown as proof the read
  // worked, and stored on the Job either way.
  const [jobDetails, setJobDetails] = useState(null);
  // The company, which the form has no field for: it is the posting's fact, not the
  // user's answer, so it is shown in the summary and never asked for.
  const [company, setCompany] = useState('');

  const canAdd = roleInput.trim().length > 0 && jdInput.trim().length >= 25;
  const canDraft = roleInput.trim().length > 0 && !drafting;
  const draftCost = costForActionTier('DRAFT_JD', 'light') ?? 1;
  const showGuide = !!linkGuide && jdInput.trim().length < FULL_JD_CHARS;
  const submitText = submitLabel || t('ariaStudio.jobCapture.add');

  const submit = () => {
    const jobTitle = roleInput.trim();
    const jobDescription = jdInput.trim();
    if (!jobTitle || jobDescription.length < 25) return;
    onSubmit?.({
      jobTitle,
      jobDescription,
      jdSource: linkJob ? 'url' : wasDrafted ? 'ai_drafted' : 'pasted',
      jobId: linkJob?._id || null,
    });
  };

  // Read a posting straight off its URL. The scrape IS the Job record, so a successful
  // fetch both fills this card and saves the caller an extract of its own.
  const fetchLink = async () => {
    const jobUrl = linkInput.trim();
    if (!jobUrl || view === 'fetching') return;
    const startedAt = Date.now();
    setView('fetching');
    setLinkError('');
    setLinkGuide(null);
    setTriedUrl(jobUrl);
    try {
      const job = await CVService.extractJob({ jobUrl });
      await wait(Math.max(0, MIN_READING_MS - (Date.now() - startedAt)));
      if (!aliveRef.current) return;
      const description = (job?.description || '').trim();

      // Everything we DID get goes in, even on a partial read: the title, the company and
      // the salary are worth having on their own, and they save typing.
      setRoleInput(job.title || roleInput);
      setCompany(job.company && job.company !== 'Unknown Company' ? job.company : '');
      setJdInput(description);
      setWasDrafted(false);
      setJobDetails(job?.details && Object.keys(job.details).length ? job.details : null);

      // The server grades what it found. A summary is NOT the job description, so it does
      // not get to carry the Job id: leaving `linkJob` null means submitting re-extracts
      // from whatever text is on screen, and the stored record then matches what was
      // actually analysed.
      const full = job?.descriptionQuality === 'full';
      setLinkJob(full ? job : null);
      setLinkGuide(full ? null : 'teaser');
      setView('summary');
    } catch (err) {
      // The floor applies to a failure too: a link that fails instantly should still look
      // like it was tried, not like the button rejected it.
      await wait(Math.max(0, MIN_READING_MS - (Date.now() - startedAt)));
      if (!aliveRef.current) return;
      setLinkJob(null);
      setLinkGuide('blocked');
      setLinkError(
        err?.response?.status === 403
          ? t('ariaStudio.jobCapture.linkBlocked')
          : t('ariaStudio.jobCapture.linkFailed')
      );
      // Nothing came back, so there is nothing to summarise. Back to the fields, where
      // the guide can point at them.
      setView('form');
    }
  };

  const draftWithAria = async () => {
    const jobTitle = roleInput.trim();
    if (!jobTitle || drafting) return;
    setDrafting(true);
    setDraftError('');
    try {
      const res = await CVService.studioDraftJobDescription(jobTitle, model);
      setJdInput(res.jobDescription || '');
      setWasDrafted(true);
      // A drafted description is the user's own material now, not the posting's — so the
      // scraped record can't speak for it and the summary has nothing left to show.
      setLinkJob(null);
      setView('form');
      // Broadcast the post-charge balance the server just returned, exactly as every
      // other paid action does (StudioChat, SectionCoach, SummaryTrim...). Without
      // this the navbar/sidebar wallet keeps rendering the pre-deduction number until
      // a reload — the draft silently costs a credit the user can't see leave.
      if (typeof res?.remainingCredits === 'number') {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: res.remainingCredits }));
      }
    } catch (err) {
      const code = err?.response?.data?.code;
      setDraftError(
        code === 'INSUFFICIENT_CREDITS'
          ? t('ariaStudio.jobCapture.draftInsufficientCredits')
          : t('ariaStudio.jobCapture.draftFailed')
      );
    } finally {
      setDrafting(false);
    }
  };

  // The fork, shown in whichever view the user is standing in. Two ways on rather than an
  // apology, because either one gets them to the same place.
  const guide = (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-500/30 dark:bg-amber-500/10">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">
        {linkGuide === 'teaser'
          ? t('ariaStudio.jobCapture.guide.partialTitle')
          : t('ariaStudio.jobCapture.guide.blockedTitle')}
      </p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
        {linkGuide === 'teaser'
          ? t('ariaStudio.jobCapture.guide.partialBody')
          : t('ariaStudio.jobCapture.guide.blockedBody')}
      </p>

      <div className="mt-3 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
            {t('ariaStudio.jobCapture.guide.copyStep')}
          </span>
          {triedUrl && (
            <a
              href={triedUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[12.5px] font-semibold text-slate-700 transition-colors hover:border-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              {t('ariaStudio.jobCapture.guide.openPosting')}
            </a>
          )}
          {/* From the summary the fields are one step away, so the paste target has to be
              reachable from here — otherwise "paste it below" points at nothing. */}
          {view === 'summary' && (
            <button
              type="button"
              onClick={() => setView('form')}
              className="text-[12.5px] font-semibold text-slate-700 underline decoration-amber-400 underline-offset-4 transition-colors hover:text-slate-950 dark:text-slate-200 dark:hover:text-white"
            >
              {t('ariaStudio.jobCapture.guide.pasteHere')}
            </button>
          )}
        </div>

        <div className="border-t border-amber-200/70 pt-2.5 dark:border-amber-500/20">
          <p className="text-[13px] text-slate-700 dark:text-slate-200">
            {t('ariaStudio.jobCapture.guide.draftStep')}
          </p>
          {drafting ? (
            <div className="mt-1.5">
              <AriaThinking variant="chat" label={t('ariaStudio.jobCapture.drafting')} />
            </div>
          ) : (
            <button
              type="button"
              onClick={draftWithAria}
              disabled={!canDraft}
              title={
                !roleInput.trim() ? t('ariaStudio.jobCapture.draftAssistNeedsTitle') : undefined
              }
              className="mt-1.5 text-[13px] font-semibold text-slate-800 underline decoration-amber-400 underline-offset-4 transition-colors hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-100 dark:hover:text-white"
            >
              {t('ariaStudio.jobCapture.draftAssist', { cost: draftCost })}
            </button>
          )}
          {/* Said plainly: a typical description is a stand-in, and an analysis against it
              is an analysis against the role, not this posting. */}
          <p className="mt-1.5 text-[11.5px] leading-snug text-slate-500 dark:text-slate-400">
            {t('ariaStudio.jobCapture.guide.draftNote')}
          </p>
        </div>
      </div>
    </div>
  );

  // The card FRAME stays put across all three views and only its contents change — so
  // the switch reads as one card thinking, rather than three cards replacing each other.
  //
  //  · `layout` interpolates the height, which is what stops the tall summary snapping
  //    open under the short reading state.
  //  · `mode="wait"` holds the incoming view until the outgoing one has left; crossfading
  //    them would briefly show a form and its own result on top of each other.
  const shell = (children) => (
    // `wide` — this card is a workspace, not speech: a full JD needs room to paste and
    // read. `min-w-0` lets it shrink below the flex basis on a 360px screen instead of
    // forcing horizontal scroll.
    <AriaCard cardKey="jobform">
      <motion.div
        layout={reduce ? false : 'position'}
        transition={SPRING_CARD}
        className="w-full min-w-0 overflow-hidden rounded-2xl rounded-tl-md border border-slate-200 bg-white p-5 shadow-md dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={reduce ? { duration: 0.15 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </AriaCard>
  );

  // ── Fetching ──
  if (view === 'fetching') {
    return shell(
      <div
        className="flex flex-col items-center justify-center py-10 text-center"
        role="status"
        aria-live="polite"
      >
        <span className="aria-orbit-slow inline-block">
          <AriaOrbit size={52} working />
        </span>
        <p className="mt-4 text-[15px] font-semibold text-slate-800 dark:text-slate-100">
          {t('ariaStudio.jobCapture.fetching')}
        </p>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {hostOf(triedUrl)}
        </p>
      </div>
    );
  }

  // ── Summary ──
  if (view === 'summary') {
    return shell(
      <>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t('ariaStudio.jobCapture.summary.eyebrow')}
        </p>
        <h3 className="mt-1.5 text-[20px] font-bold leading-tight tracking-[-0.02em] text-slate-950 dark:text-white">
          {roleInput || t('ariaStudio.jobCapture.summary.untitledRole')}
        </h3>
        {company && (
          <p className="mt-0.5 text-[14px] text-slate-500 dark:text-slate-400">{company}</p>
        )}

        {jobDetails && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <DetailChip icon={MapPin} value={jobDetails.location} />
            <DetailChip icon={Banknote} value={jobDetails.salary} />
            <DetailChip icon={Briefcase} value={jobDetails.employmentType} />
            <DetailChip icon={CalendarDays} value={jobDetails.datePosted} />
          </div>
        )}

        {showGuide && <div className="mt-4">{guide}</div>}

        {/* The description as READ, not as an input. Scrolls inside its own box so a
            3,000-word posting doesn't push the actions off the bottom of the chat. */}
        <div className="mt-4">
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {t('cvBuilder.atsCoach.jobDescription')}
          </p>
          <div className="max-h-[260px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-900/60">
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
              {jdInput}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setView('form')}
            className="rounded-lg px-2 py-1.5 text-[14px] font-semibold text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
          >
            ✎ {t('ariaStudio.pinnedEntry.edit')}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canAdd}
            className="btn-primary px-5 py-2 text-[16px] disabled:opacity-50"
          >
            {submitText}
          </button>
        </div>
      </>
    );
  }

  // ── Form ──
  return shell(
    <>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
        {t('ariaStudio.jobCapture.theJob')}
      </p>

      {allowLink && (
        <div className="mt-3">
          <label
            htmlFor="studio-job-link"
            className="mb-1 block text-[12px] font-semibold text-slate-600 dark:text-slate-300"
          >
            {t('ariaStudio.jobCapture.linkLabel')}
          </label>
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Link2
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                aria-hidden="true"
              />
              <input
                id="studio-job-link"
                type="url"
                value={linkInput}
                onChange={(e) => {
                  setLinkInput(e.target.value);
                  setLinkError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    fetchLink();
                  }
                }}
                placeholder={t('ariaStudio.jobCapture.linkPlaceholder')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-[14px] text-slate-800 outline-none transition-colors placeholder-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-white dark:focus:ring-white/20"
              />
            </div>
            <button
              type="button"
              onClick={fetchLink}
              disabled={!linkInput.trim()}
              className="btn-secondary shrink-0 px-3 py-2 text-[13px] disabled:opacity-50"
            >
              {t('ariaStudio.jobCapture.linkRead')}
            </button>
          </div>
          {linkError && !showGuide && (
            <p className="mt-1 text-[12px] text-rose-600 dark:text-rose-400">{linkError}</p>
          )}

          {showGuide && <div className="mt-3">{guide}</div>}

          {/* Not a divider for its own sake: both paths fill the same two fields, so it
              has to be clear the form below is the RESULT of the link rather than a
              second thing to complete. */}
          <p className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {t('ariaStudio.jobCapture.linkOrType')}
          </p>
        </div>
      )}

      <label
        htmlFor="studio-job-title"
        className="mb-1 mt-3 block text-[12px] font-semibold text-slate-600 dark:text-slate-300"
      >
        {t('cvBuilder.atsCoach.jobTitleRole')}
      </label>
      <input
        id="studio-job-title"
        value={roleInput}
        onChange={(e) => {
          setRoleInput(e.target.value);
          setDraftError('');
          setLinkJob(null);
        }}
        placeholder={t('cvBuilder.atsCoach.jobTitlePlaceholder')}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-[14px] text-slate-800 outline-none transition-colors placeholder-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-white dark:focus:ring-white/20"
      />

      <label
        htmlFor="studio-job-description"
        className="mb-1 mt-3 block text-[12px] font-semibold text-slate-600 dark:text-slate-300"
      >
        {t('cvBuilder.atsCoach.jobDescription')}
      </label>
      {wasDrafted && (
        <p className="mb-1.5 text-[12px] text-amber-700 dark:text-amber-400">
          {t('ariaStudio.jobCapture.draftedNote')}
        </p>
      )}
      <textarea
        id="studio-job-description"
        value={jdInput}
        onChange={(e) => {
          const next = e.target.value;
          setJdInput(next);
          // A clear-and-replace means whatever comes next isn't Aria's draft anymore.
          // A light edit of the draft still counts as ai_drafted, so only react to
          // the textarea going empty, not to every keystroke.
          if (wasDrafted && !next.trim()) setWasDrafted(false);
          // The scraped Job, by contrast, is dropped on ANY edit: it is a stored record
          // the analysis would run against, so it has to match this text exactly.
          setLinkJob(null);
        }}
        placeholder={t('cvBuilder.atsCoach.jobDescriptionPlaceholder')}
        className="min-h-[150px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-[14px] leading-relaxed text-slate-800 outline-none transition-colors placeholder-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-white dark:focus:ring-white/20 sm:min-h-[190px] lg:min-h-[230px]"
      />

      {!jdInput.trim() && (
        <div className="mt-2">
          {drafting ? (
            <AriaThinking variant="chat" label={t('ariaStudio.jobCapture.drafting')} />
          ) : (
            <button
              type="button"
              onClick={draftWithAria}
              disabled={!canDraft}
              title={
                !roleInput.trim() ? t('ariaStudio.jobCapture.draftAssistNeedsTitle') : undefined
              }
              className="text-[14px] font-semibold text-slate-500 transition-colors hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-100"
            >
              {t('ariaStudio.jobCapture.draftAssist', { cost: draftCost })}
            </button>
          )}
          {draftError && (
            <p className="mt-1 text-[12px] text-rose-600 dark:text-rose-400">{draftError}</p>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onCancel?.()}
          className="rounded-lg px-2 py-1.5 text-[14px] font-semibold text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
        >
          {t('common.back')}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canAdd}
          className="btn-primary px-5 py-2 text-[16px] disabled:opacity-50"
        >
          {submitText}
        </button>
      </div>
    </>
  );
};

export default JobCaptureCard;
