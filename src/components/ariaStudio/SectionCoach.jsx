import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
// `motion` is used only via <motion.div> in JSX; this eslint config lacks
// jsx-uses-vars so it reads as unused — suppress the false positive.
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Phone } from 'lucide-react';
import AnswerExamples from './AnswerExamples';
import CVService from '../../services/cv.service';
import { tierOf, costForActionTier } from '../../lib/models';
import { failureReason } from '../../lib/ariaFailure';
import { CAREER_STAGES } from '../../lib/careerStages';
import { useAriaModel } from '../../hooks/useAriaModel';
import { useGenerationModel } from '../../hooks/useGenerationModel';
import { useAriaStudio } from '../../context/AriaStudioContext';
import AriaComposer from '../cv/AriaComposer';
import AriaThinking from '../cv/AriaThinking';
import AriaCard from './AriaCard';
import AriaLiveOrb from './AriaLiveOrb';
import AriaCallTipsModal from './AriaCallTipsModal';
import AriaCallSettingsButton from './AriaCallSettingsButton';
import { readStoredCallSettings } from '../../lib/ariaCallSettings';
import CallEndedCard from './CallEndedCard';
import UserService from '../../services/user.service';
import BillingService from '../../services/billing.service';
import GenerationModelRow from '../cv/GenerationModelRow';
import { createAriaCall, isAriaLiveSupported, END_REASONS } from '../../lib/ariaLive';

// The focused build-with, ported to the Studio. This is a COPY OF THE PROTOCOL from
// the CV builder's AskAriaGenerate — not of the file, which is bound to CVContext and
// must not be touched. Same server contract, same turn cap, same charge points:
//
//   free Q&A (/coach/chat, focused → intent 'building'/'ready' is FREE)
//     → readyToDraft → count picker (GENERATE_BULLET × count)
//     → /coach/generate-bullets → results with per-bullet toggles
//     → apply through the provider writer → free re-band
//
// Studio allows enough turns to unpack several activities one at a time.
// tracked here and sent with every turn.
const TURN_CAP = 10;

// The Studio's section names vs the builder step vocabulary /coach/chat expects.
// Mapping rather than renaming keeps the existing section-specific prompts firing.
const STEP_FOR_SECTION = { experience: 'history', project: 'projects' };

const SectionCoach = ({
  draftId,
  entry, // { section: 'experience'|'project', sortId, title, company }
  // The MEASURED gaps for this section, straight off the scan — the terms this fix was
  // opened to close. Display only; the server sources its own gaps for the prompt
  // (scopedMissingKeywords), so nothing here steers what Aria asks.
  //
  // Only the fix loop has them. The build track used to pass the job's must-haves instead,
  // which meant the same two words sat under every role for the whole build: not measured,
  // not entry-specific, and claiming to "aim at" terms the entry may already cover is the
  // kind of small invented progress that teaches people to distrust the rest of the read.
  missingKeywords = [],
  messages = [], // the SHARED studio stream — coach turns persist with everything else
  onPush, // (…msgs) => void
  onApply, // (add[], remove[]) => Promise<{ ok, found }>
  onDone, // (result|null) => void — the interview produced bullets, or the entry vanished
  // () => void — leave without applying anything. Kept separate from onDone(null): that is
  // the 404 "entry deleted" contract.
  //
  // This USED to be omitted on the build track, on the reasoning that the pinned card's
  // "next role" / "done" were its exits. They are not exits: "next role" is disabled until
  // the entry is complete, and "done" stamps the section finished. Someone who opened the
  // interview by mistake had no way out of it at all, which is what the build track now
  // passes a cancel for.
  onBack,
  // What that control says. The fix track is going back somewhere ("Back to sections");
  // the build track is stopping ("Cancel"), and calling that "back" would promise a
  // destination it does not have.
  backLabel = '',
  dockNode = null, // the pinned DOM slot StudioChat provides for this composer (portal target)
  careerStage = null, // picked stage, lifted to StudioChat so it persists across roles
  onPickCareerStage, // (k) => void — lifts the pick to the parent
  // () => void — take the user to buy Aria call minutes. A CALLBACK rather than a
  // useNavigate in here: this component is mounted from several surfaces and by several
  // test harnesses, and reaching for router context makes it unmountable without a Router
  // it has no other need for.
  onGetMinutes,
  // ─── A turn that didn't get through ───
  //
  // The interview writes into StudioChat's stream, so StudioChat owns the failure too: it
  // marks the user's own message "not sent" and renders the Retry under it. These two
  // props are the interview's half of that contract.
  onFailed, // (reasonKey) => void — mark THEIR last message, don't push an Aria bubble
  // (fn|null) => void — hand StudioChat this coach's send, so Retry re-runs the INTERVIEW
  // turn (focused on this entry, with its turn count) instead of dropping the answer into
  // the general chat, which is what a plain resend from the stream would do.
  onRegisterSend,
}) => {
  const { t, i18n } = useTranslation();
  const isProject = entry?.section === 'project';
  // Mirrors the backend: a non-'job' experience entry type (internship/part-time/
  // volunteering/coursework) is coached gently even in an experienced session, so the
  // defensive metric-strip on Aria's reply and sample example also applies here.
  const entryLevelType =
    entry?.section === 'experience' && !!entry?.entryType && entry.entryType !== 'job';
  const isGradCareer = careerStage === 'grad' || entryLevelType;
  const { cvData, updateCvData } = useAriaStudio();
  // The charged generation still waiting on THIS entry, or null. One pending card is
  // shared by the whole Studio session, so it's matched on section + sortId.
  const pendingGeneration = cvData?.studioPending;
  const restored =
    pendingGeneration?.kind === 'bullets' &&
    pendingGeneration.section === entry?.section &&
    pendingGeneration.sortId === entry?.sortId
      ? pendingGeneration
      : null;

  // The session's Aria model. The coach owns the docked composer while it drives, so its
  // picker has to write through to the same per-draft choice as StudioChat's.
  const { modelId, selectModel } = useAriaModel({ draftId, cvData, updateCvData });

  // The GENERATION model — independent of the chat model above. A per-user
  // localStorage preference, defaulting to whatever the chat model is.
  const { genModelId, setGenModelId } = useGenerationModel(modelId);

  const REC = isProject ? 4 : 6;
  // Priced at the GENERATION model's tier, not the chat model's — Pro must be
  // quoted (and charged) the flagship rate.
  const per = costForActionTier('GENERATE_BULLET', tierOf(genModelId)) ?? 1;

  const [phase, setPhase] = useState(restored ? 'results' : 'chat'); // chat | picking | generating | results
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [description, setDescription] = useState(restored?.description || '');
  const [count, setCount] = useState(restored?.count || REC);
  const [bullets, setBullets] = useState(restored?.bullets || []);
  const [bulletDetails, setBulletDetails] = useState(restored?.bulletDetails || []);
  const [selected, setSelected] = useState(
    new Set((restored?.bullets || []).map((_, index) => index))
  );
  const [applying, setApplying] = useState(false);
  const [wasFree, setWasFree] = useState(!!restored?.wasFree);
  // The TWO sample answers for the question just asked. The server's `suggestions` — the
  // short first-person openings — are deliberately not held here, and that is now SAFE
  // rather than merely hoped-for: the prompt requires them in the reply and the server
  // appends them when the model forgets (utils/ariaStarters), so they arrive as bullets
  // inside Aria's message with their own copy control. This comment used to assert the
  // same thing with nothing enforcing it, which is why they vanished on half the turns.
  const [exampleAnswers, setExampleAnswers] = useState([]);
  // Set when the interview closes; handed to onDone so the parent can offer the
  // cross-history hunt AFTER the bullets land. See the readyToDraft branch below.
  const [huntOffers, setHuntOffers] = useState([]);
  const inputRef = useRef(null);

  // Re-sync when a pending generation lands AFTER this mounted.
  //
  // The initialisers above read `studioPending` exactly once, so they only catch it when
  // the draft is already in context at mount. Often it isn't — the pin resolves from the
  // transcript, StudioChat remounts wholesale on sessionNonce, and the draft arrives on
  // its own fetch. On those orderings already-PAID-FOR bullets were dropped on the floor
  // and the card fell back to a fresh interview. Mirrors the skills/summary re-sync
  // StudioChat already runs for the same reason.
  useEffect(() => {
    if (!restored?.bullets?.length) return;
    // Never stomp what's on screen: a live result, or a re-roll still in flight.
    if (bullets.length || phase === 'generating') return;
    setBullets(restored.bullets);
    setBulletDetails(restored.bulletDetails || []);
    setSelected(new Set(restored.bullets.map((_, index) => index)));
    setDescription(restored.description || '');
    setCount(restored.count || REC);
    setWasFree(!!restored.wasFree);
    setPhase('results');
  }, [restored, bullets.length, phase, REC]);

  // The marker that OPENED this coach session — the entry's own `pinrole` in a build, or
  // the `fixstart` that aimed the coach at it in the fix loop. BOTH tracks have to be
  // matched here: the fix loop never writes a `pinrole`, so a pin-only search finds
  // nothing on that path and every window derived from it silently spans everything.
  const sessionStart = (() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m?.who === 'pinrole' && m.sortId === entry?.sortId) return i;
      if (m?.who === 'fixstart' && m.mode === 'coach' && m.entry?.sortId === entry?.sortId)
        return i;
    }
    return -1;
  })();

  // The visible Studio transcript spans every entry; the coach only ever sees THIS
  // session. Scoped from the marker that started it, in either track.
  //
  // This is the payload POSTed to /coach/chat, so the window is not cosmetic: a wider one
  // primes a PAID generation with another entry's answers, and the model duly attributes
  // that entry's achievements to this one. (It also makes a fresh entry read as
  // mid-conversation, suppressing its opening suggestions and example.)
  //
  // A message marked `failed` never reached the server, so it is not part of the
  // conversation: dropping it here is what lets Retry resend it without the model seeing
  // the same answer twice, and keeps an abandoned one out of the turn count below.
  const coachMessages = (sessionStart >= 0 ? messages.slice(sessionStart + 1) : messages).filter(
    (m) => !m.failed
  );

  // Turns already spent on THIS coach session — DERIVED from the restored transcript
  // rather than counted in a ref. The ref reset to 0 on every refresh, so Aria reopened
  // the interview at turn one (and misreported the cap) even though the whole Q&A was
  // sitting right there in the stream. Never counted from the whole transcript: the
  // backend turns `buildTurns` into a hard "wrap this up now", so over-counting would end
  // an interview on turn one.
  //
  // Two kinds of message do not count:
  //   · FAILED ones never reached the server (coachMessages already drops them), so they
  //     are not a turn, and counting them would let an abandoned answer eat the budget.
  //   · SPOKEN ones. The cap exists to bound FREE typed turns; call turns were paid for in
  //     minutes. Counting them meant that choosing "keep going in chat" after a long call hit
  //     the cap on the very first typed message, and the server forced a wrap-up — the
  //     opposite of what the user had just asked for.
  const turnsTaken =
    sessionStart >= 0 ? coachMessages.filter((m) => m.who === 'user' && !m.spoken).length : 0;

  // The turn budget is the AI CONVERSATION's, not the CV's — the server turns `buildTurns`
  // into a hard "wrap this up now". Shown as a permanent "1/10" it read like a score, and
  // now that the top bar carries a real progress number it would compete with it. So it
  // only speaks near the limit, where it is genuinely news: Aria is about to close the role.
  const nearTurnLimit = turnsTaken >= TURN_CAP - 3;

  // One free re-roll is granted per charged generation — the SERVER owns that via
  // genState, so this only tracks whether the last result claimed it.
  const rerollNote = wasFree ? t('ariaStudio.sectionCoach.rerollWasFree') : '';

  const persistPending = async (pending) => {
    updateCvData({ studioPending: pending });
    try {
      await CVService.saveDraft({ _id: draftId, studioPending: pending });
      return true;
    } catch (err) {
      console.error('Failed to persist pending bullet generation', err);
      toast.error(t('ariaStudio.chat.toast.saveFailed'));
      return false;
    }
  };

  // A call the USER ended (or the clock did), awaiting their choice of what happens next.
  // { reason, turns } — the turns are kept here because they are what gets banked if they
  // choose bullets. Null when there is nothing to decide.
  const [callEnded, setCallEnded] = useState(null);
  const [callTipsOpen, setCallTipsOpen] = useState(false);
  // How they like their calls. Seeded synchronously from the stored user so the chip shows
  // the real choice on first paint; saved to the account on every change so it follows them.
  const [callSettings, setCallSettings] = useState(readStoredCallSettings);

  const send = async (text) => {
    const val = (text ?? input).trim();
    if (!val || thinking) return;

    // Typing instead of choosing IS a choice — carry on in chat — so the card steps aside.
    setCallEnded(null);
    const next = [...coachMessages, { who: 'user', text: val }];
    onPush({ who: 'user', text: val });
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setExampleAnswers([]);
    setThinking(true);

    try {
      const r = await CVService.coachChat({
        draftId,
        currentStepId: STEP_FOR_SECTION[entry.section] || 'history',
        // Markers carry no `text`, so the filter leaves the API a clean transcript.
        messages: next
          .filter((m) => m.who === 'aria' || m.who === 'user')
          .map((m) => ({ who: m.who, text: m.text })),
        focus: { section: entry.section, sortId: entry.sortId },
        buildTurns: turnsTaken + 1,
        studioInterview: true,
        model: modelId,
        // Ride the picked stage along (undefined → backend infers from the draft).
        stage: careerStage,
      });

      // The selected career stage must win even if the provider slips back into its
      // experienced-role framing. Keep students/recent grads away from invented or
      // metric-shaped prompts at this final presentation boundary.
      const metricPrompt =
        /\b(?:efficiency|downtime|revenue|percentage|metric)s?\b|\bby\s+_+|\d+(?:\.\d+)?\s?%|\$\s?\d/i;
      // THE LAST-RESORT METRIC GUARD, for when the provider slips back into its
      // experienced-role framing after the server has stopped looking.
      //
      // It used to swap the ENTIRE reply for a canned sentence, which threw away Aria's
      // real question AND the answer starters underneath it — one stray word like
      // "efficiency" anywhere in a good reply and an entry-level user got a generic line
      // instead. Now only the offending PARAGRAPH is dropped; the canned line is the
      // fallback for when that leaves nothing, not the first move.
      const scrubMetricPressure = (markdown) => {
        const kept = String(markdown || '')
          .split(/\n{2,}/)
          .filter((para) => !metricPrompt.test(para));
        return kept.join('\n\n').trim();
      };
      const reply = r.readyToDraft
        ? t('ariaStudio.sectionCoach.readyForBullets')
        : isGradCareer && metricPrompt.test(r.reply || '')
          ? scrubMetricPressure(r.reply) || t('ariaStudio.sectionCoach.gradFollowUp')
          : r.reply;
      // The server already scrubs these for a grad stage; this is the same guard applied
      // at the last presentation boundary, for the case where the provider slips back into
      // its experienced-role framing after the server has stopped looking.
      //
      // `exampleAnswer` is still read as a fallback so a response from a not-yet-deployed
      // server still puts a real sample on screen instead of an empty panel.
      const safeExamples = (
        Array.isArray(r.exampleAnswers) && r.exampleAnswers.length
          ? r.exampleAnswers
          : [r.exampleAnswer]
      )
        .map((s) => String(s || '').trim())
        .filter((s) => s && !(isGradCareer && metricPrompt.test(s)));
      // `feedbackId` rides on the message so the 👍/👎 controls know what they rate, and
      // still know after a refresh. Dropping it made the build interview the only Aria
      // surface with no way to say an answer was wrong — on the turns that matter most.
      onPush({ who: 'aria', text: reply, feedbackId: r.feedbackId });
      setExampleAnswers(safeExamples);
      // A metered turn (flagship build-with, or general chat past the daily pool)
      // returns the post-charge balance — keep the wallet pill live without a refresh.
      if (r.remainingCredits != null) {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: r.remainingCredits }));
      }

      if (r.readyToDraft) {
        const desc =
          (r.description || '').trim() ||
          next
            .filter((m) => m.who === 'user')
            .map((m) => m.text)
            .join('. ');
        setDescription(desc);
        // Requirements this entry could NOT prove, which the server says are worth taking
        // to the rest of the CV. Held rather than shown: interrupting here would put a
        // question between the user and the bullets they are two taps from getting. It
        // rides out on onDone, once the interview is genuinely over.
        setHuntOffers(Array.isArray(r.huntOffers) ? r.huntOffers : []);
        // Aria has enough truthful material; move directly to the bullet-count choice.
        setPhase('picking');
      }
    } catch (e) {
      if (e?.response?.status === 404) {
        // The entry was deleted WHILE this turn was in flight — the Live Preview's Remove,
        // or another tab. The backend answers 404 "that role is no longer in your CV" with
        // no `code`, so it's matched on status. Say what happened and close cleanly:
        // onDone(null) is the "backed out, nothing applied" contract, which early-returns
        // before any recompute. A red toast would be wrong — nothing failed, and the
        // deletion was almost certainly deliberate.
        onPush({ who: 'aria', text: t('ariaStudio.sectionCoach.entryGone') });
        onDone?.(null);
      } else {
        // Everything else is a turn that DIDN'T HAPPEN — a 500, a rate limit, no credits
        // for the Pro model, a daily cap. It used to be a red toast (gone by the time you
        // looked up) or an Aria bubble saying what went wrong, and either way the answer
        // they had just typed sat in the thread looking sent with no way forward but
        // retyping it. Mark THEIR message instead: StudioChat renders the reason and a
        // Retry under it, and the retry comes back through this same send.
        //
        // The toast survives ONLY as the fallback for a host that didn't wire onFailed —
        // a turn that fails and says nothing at all would be worse than the bug this
        // replaces.
        if (onFailed) onFailed(failureReason(e));
        else toast.error(t('ariaStudio.chat.chatUnreachable'));
      }
    } finally {
      setThinking(false);
    }
  };

  // StudioChat's Retry lives on the message, which is in its stream, not ours — so it
  // needs this send to call. Re-registered on EVERY render (no dep array) so the closure
  // it holds is never stale: `thinking`, the turn count and the picked model all move.
  //
  // `busy` rides along because the retry DROPS the failed message before resending it: a
  // send that refused (mid-turn) would leave it deleted and unsent, which is worse than
  // the bug being fixed. StudioChat waits instead.
  useEffect(() => {
    onRegisterSend?.({ send, busy: thinking });
    return () => onRegisterSend?.(null);
  });

  const generate = async (reroll = false) => {
    setPhase('generating');
    try {
      const res = await CVService.coachGenerateBullets({
        draftId,
        section: entry.section,
        sortId: entry.sortId,
        description: description.trim(),
        count,
        reroll,
        model: genModelId,
      });
      setBullets(res.bullets || []);
      setBulletDetails(res.bulletDetails || []);
      setSelected(new Set((res.bullets || []).map((_, i) => i))); // all on by default
      setWasFree(!!res.wasFree);
      await persistPending({
        kind: 'bullets',
        section: entry.section,
        sortId: entry.sortId,
        description: description.trim(),
        count,
        bullets: res.bullets || [],
        bulletDetails: res.bulletDetails || [],
        wasFree: !!res.wasFree,
      });
      if (res.remainingCredits != null) {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: res.remainingCredits }));
      }
      setPhase('results');
    } catch (e) {
      const code = e?.response?.data?.code;
      toast.error(
        code === 'INSUFFICIENT_CREDITS'
          ? t('cvBuilder.askAria.notEnoughCredits')
          : e?.response?.data?.message || t('cvBuilder.askAria.couldntGenerate')
      );
      setPhase(reroll ? 'results' : 'picking');
    }
  };

  const toggle = (i) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const apply = async () => {
    const add = [...selected].map((i) => bullets[i]).filter(Boolean);
    if (!add.length) return;
    setApplying(true);
    const res = await onApply(add, []);
    setApplying(false);
    if (res?.ok) {
      if (!(await persistPending(null))) return;
      onDone?.({ entry, applied: add, huntOffers });
    } else if (res && !res.found) {
      toast.error(
        t('cvBuilder.askAria.couldntFind', {
          kind: isProject ? t('cvBuilder.common.project') : t('cvBuilder.common.role'),
        })
      );
    } else {
      toast.error(t('cvBuilder.askAria.syncFailed'));
    }
  };

  // The coach's own composer (floating free-status + textarea + Back/turns row). Rendered while
  // she's interviewing. It must stay PINNED, not scroll away with the stream — so it's
  // portaled into StudioChat's docked slot (`dockNode`) rather than sitting inside the
  // scroll region. Falls back to inline only if the slot isn't attached yet (one frame).
  // ─── ARIA LIVE ───
  //
  // Aria conducts the call herself, from a prompt built server-side out of this draft (the
  // role brief's must-haves, the career stage, the project funnel). She is NOT calling
  // coachChatTurn on each turn: Realtime tool calls are synchronous, so every turn would
  // stall 1.5-3s waiting on our backend, and past ~1.5s of silence people hang up.
  //
  // The brain still gets the last word. Each finalised turn is pushed straight into the
  // transcript as it is spoken, and when the call ends the whole thing goes to
  // coachChatTurn ONCE — which returns the description, the verified evidence ledger and
  // the hunt offers through exactly the path a typed interview uses.
  const [call, setCall] = useState(null);
  const [callStarting, setCallStarting] = useState(false);
  const [callState, setCallState] = useState('connecting');
  const [callStream, setCallStream] = useState(null);
  const [callSecondsLeft, setCallSecondsLeft] = useState(null);
  const [callOutOfMinutes, setCallOutOfMinutes] = useState(false);

  // Roles and projects only. Education, skills and the summary are short factual fields
  // where typing is faster than talking, so a call there would spend minutes to make the
  // user slower. isAriaLiveSupported is false in the Android WebView (no RECORD_AUDIO),
  // which is why the button simply does not render there rather than failing when pressed.
  const canCall =
    !call &&
    !callOutOfMinutes &&
    (entry?.section === 'experience' || entry?.section === 'project') &&
    isAriaLiveSupported();

  const endCall = () => {
    setCall((current) => {
      current?.stop();
      return null;
    });
    setCallStream(null);
    setCallSecondsLeft(null);
    setCallState('connecting');
  };

  // What the call was FOR. One coachChatTurn over the spoken transcript, forced to wrap by
  // sending the turn cap as buildTurns (coach.controller's `mustFinish`) — the same
  // mechanism that ends a long typed interview. From here the flow is identical: a
  // description, an evidence ledger, and the bullet-count picker.
  //
  // Two turns is the floor. A call someone abandoned after "hello" has nothing in it, and
  // sending that would spend a turn to be told so.
  const bankCallTranscript = async (turns) => {
    const messages = (turns || [])
      .map((turn) => ({
        who: turn.role === 'candidate' ? 'user' : 'aria',
        text: String(turn.text || '').trim(),
      }))
      .filter((m) => m.text);
    if (messages.filter((m) => m.who === 'user').length < 1 || messages.length < 2) return;

    setThinking(true);
    try {
      const r = await CVService.coachChat({
        draftId,
        currentStepId: STEP_FOR_SECTION[entry.section] || 'history',
        messages,
        focus: { section: entry.section, sortId: entry.sortId },
        buildTurns: TURN_CAP,
        studioInterview: true,
        model: modelId,
        stage: careerStage,
      });

      const desc =
        (r.description || '').trim() ||
        messages
          .filter((m) => m.who === 'user')
          .map((m) => m.text)
          .join('. ');
      setDescription(desc);
      setHuntOffers(Array.isArray(r.huntOffers) ? r.huntOffers : []);
      if (r.remainingCredits != null) {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: r.remainingCredits }));
      }
      setPhase('picking');
    } catch (err) {
      console.error('[AriaLive] could not bank the call', err);
      // The words are not lost — every turn is already in the chat, and the composer is
      // back, so the user can carry on typing from where the call left off.
      toast.error(t('ariaStudio.ariaLive.couldntFinish'));
    } finally {
      setThinking(false);
    }
  };

  const startCall = async () => {
    if (callStarting || call) return;
    setCallEnded(null);
    setCallStarting(true);
    setCallOutOfMinutes(false);
    let spokenTurns = [];
    const controller = createAriaCall({
      draftId,
      section: entry.section,
      lang: i18n.language?.slice(0, 2) || 'en',
      callSettings,
      // Both sides into the chat as they are said — the transcript IS the record, and a
      // returning user should be able to read the conversation their bullets came out of.
      onTurn: ({ who, text }) => {
        spokenTurns.push({ role: who === 'user' ? 'candidate' : 'aria', text });
        onPush({ who, text, spoken: true });
      },
      onState: setCallState,
      onEnded: ({ reason }) => {
        setCall(null);
        setCallStream(null);
        setCallSecondsLeft(null);
        const turns = spokenTurns;
        spokenTurns = [];

        // HOW it ended decides what happens next.
        //
        // Aria ended it: she recapped, asked if there was anything else, and heard a clear
        // yes before calling finish_interview. The interview is done by the same standard a
        // typed one is — go straight to the bullets, exactly as typing does.
        if (reason === END_REASONS.ARIA_FINISHED) {
          bankCallTranscript(turns);
          return;
        }

        // The user (or the clock) ended it: that is not the same as being done. Ask. A call
        // abandoned before they said anything has nothing to decide about.
        if (turns.some((turn) => turn.role === 'candidate')) {
          setCallEnded({ reason, turns });
        }
      },
      onError: (err) => console.error('[AriaLive]', err),
    });

    try {
      await controller.start();
      setCall(controller);
      setCallStream(controller.getRemoteStream());
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === 'NO_ARIA_MINUTES') {
        // Not a failure — a boundary. Say so in the stream and offer both doors rather
        // than a red toast that vanishes.
        setCallOutOfMinutes(true);
      } else {
        toast.error(t('ariaStudio.ariaLive.couldntStart'));
      }
      controller.stop();
    } finally {
      setCallStarting(false);
    }
  };

  // THE BUTTON. Shows the brief first when it should, otherwise starts straight away.
  //
  // "Should" = the user has not turned the tips off on their account, AND this build session
  // has not shown them yet. The session half is a transcript marker rather than component
  // state, so a refresh does not bring the tips back after someone has already read them.
  // The account setting is read only now, at the click: most people never press this button,
  // and fetching a profile on every coach mount to answer a question nobody asked is waste.
  const tipsSeenThisSession = messages.some((m) => m?.who === 'calltips');
  const requestCall = async () => {
    if (callStarting || call) return;

    // BALANCE FIRST. Aria calls have no free taste, so a user who has never bought minutes
    // would otherwise read a whole brief, press Start, and only then be told they cannot
    // call. Checked at the click (not on mount), and best-effort: if the check itself fails
    // we carry on, because the server refuses a call without minutes regardless.
    try {
      const entitlement = await BillingService.getEntitlement();
      if ((entitlement?.ariaCall?.secondsRemaining ?? 0) <= 0) {
        setCallOutOfMinutes(true);
        return undefined;
      }
    } catch {
      /* the session endpoint's 402 is the real gate */
    }

    if (tipsSeenThisSession) return startCall();
    try {
      const profile = await UserService.getProfile();
      if (profile?.settings?.hideAriaCallTips) return startCall();
    } catch {
      // Could not read the setting — show the tips. Seeing them once too often is a far
      // smaller cost than a first call that goes thin for want of them.
    }
    setCallTipsOpen(true);
    return undefined;
  };

  // Applied locally at once — the call reads this state, not the profile — and saved in
  // the background. A failed save costs the choice on the next device, never this call.
  const changeCallSettings = (next) => {
    setCallSettings(next);
    UserService.updateSettings({ ariaCall: next }).catch((err) =>
      console.error('Failed to save call settings', err)
    );
  };

  const startFromTips = ({ dontShowAgain }) => {
    setCallTipsOpen(false);
    onPush({ who: 'calltips' });
    if (dontShowAgain) {
      UserService.updateSettings({ hideAriaCallTips: true }).catch((err) =>
        console.error('Failed to save the call tips preference', err)
      );
    }
    startCall();
  };

  const writeBulletsFromCall = () => {
    const turns = callEnded?.turns || [];
    setCallEnded(null);
    bankCallTranscript(turns);
  };

  const keepChattingAfterCall = () => {
    setCallEnded(null);
    // In Aria's voice, into the stream, so the typed interview visibly picks up where the
    // call stopped. Nothing is sent to the model: her next real question comes when they
    // type, with every spoken turn already in the window it reads.
    onPush({ who: 'aria', text: t('ariaStudio.ariaLive.ended.carryOn') });
  };

  // The countdown chip. Display only — the actual wrap-up warning and the hard stop at zero
  // live in lib/ariaLive.js, next to the session they act on. (An earlier version of this
  // comment said the server hangs up via a sideband; that was the gpt-live design and is no
  // longer true — Realtime never tells our server the session id.)
  useEffect(() => {
    if (!call) return undefined;
    const tick = () => setCallSecondsLeft(call.secondsLeft());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [call]);

  // The remote track arrives a beat after the answer is set, so the orb's analyser has to
  // wait for it rather than capture null once at start.
  useEffect(() => {
    if (!call || callStream) return undefined;
    const id = setInterval(() => {
      const s = call.getRemoteStream();
      if (s) setCallStream(s);
    }, 250);
    return () => clearInterval(id);
  }, [call, callStream]);

  // Leaving the interview ends the call. Without this, moving to the bullet-count picker
  // (which readyToDraft does on its own) would leave a paid call running with nobody
  // talking to it.
  useEffect(() => {
    if (call && phase !== 'chat') endCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(
    () => () => {
      call?.stop();
    },
    [call]
  );

  // ── THE CALL, standing where the textarea does ──
  //
  // Replaces the composer rather than joining it: during a call there is nothing to type
  // into, and a disabled textarea is just furniture. The coach already renders no input at
  // all in three of its four phases, so this is the seam, not a new one.
  const callComposer = phase === 'chat' && call && (
    <div className="relative shrink-0 pb-[env(safe-area-inset-bottom)]">
      <AriaLiveOrb
        state={callState}
        stream={callStream}
        secondsLeft={callSecondsLeft}
        onEnd={endCall}
      />
    </div>
  );

  const composer = phase === 'chat' && !call && (
    <div className="relative shrink-0 pb-[env(safe-area-inset-bottom)]">
      {callEnded && (
        <CallEndedCard
          reason={callEnded.reason}
          busy={thinking}
          onWriteBullets={writeBulletsFromCall}
          onKeepChatting={keepChattingAfterCall}
        />
      )}
      {/* Out of Aria call minutes. Deliberately NOT a red toast: running out is a boundary,
          not a failure, and it arrives at the exact moment the user most needs to know that
          the other way of answering still works. Both doors are on screen — buy more, or
          carry on typing — and the typed path is never taken away. */}
      {callOutOfMinutes && (
        <div className="mb-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
            {t('ariaStudio.ariaLive.outOfMinutes')}
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => onGetMinutes?.()}
              className="btn-primary w-full px-3 py-2 text-[13px] sm:w-auto"
            >
              {t('ariaStudio.ariaLive.getMinutes')}
            </button>
            <button
              type="button"
              onClick={() => setCallOutOfMinutes(false)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 sm:w-auto"
            >
              {t('ariaStudio.ariaLive.keepTyping')}
            </button>
          </div>
        </div>
      )}
      <AriaComposer
        className=""
        inputRef={inputRef}
        value={input}
        onChange={setInput}
        onSend={send}
        disabled={thinking}
        busy={thinking}
        // Was the hard-coded English string "Tell ARIA...". The translation has existed
        // in both locales all along (activityPlaceholder), so a French user was reading
        // English here — and SectionCoach.test.jsx, which finds the composer BY that
        // locale string, could not find it: seven tests in this file have been failing
        // ever since, none of them for the reason they are named after.
        placeholder={t('ariaStudio.sectionCoach.activityPlaceholder')}
        modelId={modelId}
        onSelectModel={selectModel}
        showModelPicker
        showModelNotice
        // What this fix was opened to close. It used to sit in the footer below, at 9px and
        // truncated to two terms, between a nav link and a turn counter — a row of chrome,
        // holding the one substantive thing on screen. It belongs above the input, because
        // this is the ONLY place the gaps are ever shown: the "Fixing Experience" divider
        // names the section and nothing else. Same treatment as every other composer note.
        note={
          missingKeywords.length > 0 ? (
            <p className="mb-1.5 text-center font-mono text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {t('ariaStudio.sectionCoach.aimingAt', { keywords: missingKeywords.join(', ') })}
            </p>
          ) : null
        }
        footer={
          onBack || nearTurnLimit ? (
            <div
              data-coach-footer=""
              className={`mt-1.5 flex items-center gap-2 ${onBack ? 'justify-between' : 'justify-end'}`}
            >
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  {backLabel || `← ${t('ariaStudio.sectionCoach.backToSections')}`}
                </button>
              )}
              {nearTurnLimit && (
                <span className="font-mono text-[9px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {t('ariaStudio.sectionCoach.questionsLeft', {
                    count: Math.max(0, TURN_CAP - turnsTaken),
                  })}
                </span>
              )}
            </div>
          ) : null
        }
      />
      {/* The way IN to a call. Offered only where speaking genuinely beats typing — a role
          or a project — and only on the web: the Capacitor WebView has no microphone
          permission wired up, so on Android this simply is not here and the textarea above
          is the whole feature, which is the correct degradation. */}
      {canCall && (
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={requestCall}
            disabled={thinking || callStarting}
            className="flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:border-slate-900 hover:text-slate-900 disabled:opacity-50 dark:border-slate-600 dark:text-slate-400 dark:hover:border-white dark:hover:text-white"
          >
            <Phone className="h-3 w-3" aria-hidden="true" />
            {callStarting
              ? t('ariaStudio.ariaLive.connecting')
              : t('ariaStudio.ariaLive.talkInstead')}
          </button>
          {/* How the call will go, right beside the way into it. Shows the current choice so
            nobody has to open it to know; most people won't need to. */}
          <AriaCallSettingsButton
            value={callSettings}
            onChange={changeCallSettings}
            disabled={thinking || callStarting}
          />
        </div>
      )}
    </div>
  );

  // ─── The live card for whichever step of the build we're on ───
  return (
    <>
      {/* A sent answer is already in the stream; make the model round-trip visible so
          the composer never looks stalled while Aria is preparing her follow-up. */}
      {phase === 'chat' && thinking && <AriaThinking variant="chat" />}

      {/* Career stage, offered inline when the session never captured one. A TAILOR
          session skips StudioChat's CareerStageAskCard entirely, and 'changer' is the one
          stage that CANNOT be inferred from CV shape — so without this, someone who only
          ever tailors an uploaded CV can never be coached as a career changer.

          Deliberately NOT a blocking card: it sits beside the conversation and can be
          ignored. Interrupting "Edit with Aria" with a questionnaire before the thing the
          user actually clicked is the wrong trade. Answering re-aims the very next
          question, which is when it starts to matter. */}
      {phase === 'chat' && !thinking && !careerStage && onPickCareerStage && (
        <div className="self-start pl-6 flex flex-col gap-1.5 mb-3">
          <span className="font-mono text-[8.5px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {t('ariaStudio.sectionCoach.stageNudge')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {CAREER_STAGES.map((s) => (
              <button
                key={s.k}
                type="button"
                onClick={() => onPickCareerStage(s.k)}
                className="text-[13px] sm:text-[11.5px] font-semibold px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:border-slate-900 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-white dark:hover:text-white transition-colors"
              >
                {t(s.labelKey)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* A FULL ANSWER SOUNDS LIKE — two sample answers, under Aria's build-with question.

          This was a lone "Show me an example" pill revealing one italic sentence. One
          example reads as a coincidence: people either copy it wholesale or decide it does
          not describe them. Two that differ in angle read as a range, which is what makes
          them a model rather than a script.

          The server's `suggestions` — the short first-person openings — are deliberately
          NOT shown here: Aria already writes those as bullets in her reply, where each can
          be copied on its own, so a second copy underneath would be the same text twice. */}
      {phase === 'chat' && !thinking && (
        <AnswerExamples
          // Keyed on the samples themselves, so a new turn REMOUNTS it and the panel comes
          // up collapsed for the new question instead of inheriting the last one's state.
          key={exampleAnswers.join('|')}
          examples={exampleAnswers}
        />
      )}

      <AnimatePresence>
        {/* Count picker — the first point anything costs, priced before the click. */}
        {phase === 'picking' && (
          <AriaCard cardKey="picking" key="picking">
            <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                {t('cvBuilder.askAria.howManyBullets')}
              </p>
              <div className="mt-3 grid grid-cols-5 gap-1.5 sm:gap-2">
                {[3, 4, 5, 6, 8].map((n) => {
                  const active = count === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCount(n)}
                      className={`relative flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 transition-colors ${
                        active
                          ? 'border-slate-900 dark:border-white ring-1 ring-slate-900 dark:ring-white bg-slate-50 dark:bg-slate-800'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {n}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                        {n * per} cr
                      </span>
                      {n === REC && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded-full border border-emerald-300 dark:border-emerald-700 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200 font-mono text-[9px] uppercase tracking-wide px-1.5 py-0.5">
                          {t('cvBuilder.askAria.bestFit')}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3 mt-3">
                <GenerationModelRow
                  action={isProject ? 'project' : 'experience'}
                  value={genModelId}
                  onSelect={setGenModelId}
                  chatTier={tierOf(modelId)}
                  unit="each"
                />
              </div>
              <p className="mt-3 text-[12px] text-slate-500 dark:text-slate-400">
                {isProject
                  ? t('cvBuilder.askAria.pickerNoteProject')
                  : t('cvBuilder.askAria.pickerNoteRole')}
              </p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setPhase('chat')}
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors"
                >
                  {t('common.back')}
                </button>
                <button
                  type="button"
                  onClick={() => generate(false)}
                  className="btn-primary px-5 py-2 text-sm"
                >
                  {t('ariaStudio.sectionCoach.draftCount', { n: count, cr: count * per })}
                </button>
              </div>
            </div>
          </AriaCard>
        )}

        {phase === 'generating' && (
          <AriaThinking variant="draft" label={t('ariaStudio.sectionCoach.generatingBullets')} />
        )}

        {/* Results — per-bullet toggles, a free-re-roll offer, and Apply. */}
        {phase === 'results' && bullets.length > 0 && (
          <AriaCard wide cardKey="results" key="results">
            <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                {t('ariaStudio.sectionCoach.pickWhatsTrue')}
              </p>
              {rerollNote && (
                <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {rerollNote}
                </p>
              )}
              <ul className="mt-3 space-y-2">
                {bullets.map((b, i) => {
                  const on = selected.has(i);
                  const detail = bulletDetails[i];
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(i)}
                        className={`w-full text-left flex items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors ${
                          on
                            ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <span
                          className={`shrink-0 mt-0.5 w-4 h-4 rounded flex items-center justify-center text-[11px] font-bold ${
                            on
                              ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:text-slate-900'
                              : 'border border-slate-300 dark:border-slate-600 text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                        <span className="min-w-0 text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-200">
                          <span className="block">{b}</span>
                          {!!detail?.evidence?.length && (
                            <span className="mt-1.5 block text-[10.5px] leading-snug text-slate-500 dark:text-slate-400">
                              {t('ariaStudio.sectionCoach.supportedBy', {
                                evidence: detail.evidence
                                  .slice(0, 2)
                                  .map((item) => item.claim)
                                  .join(' · '),
                              })}
                            </span>
                          )}
                          {!!detail?.requirements?.length && (
                            <span className="mt-1 block font-mono text-[9px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                              {t('ariaStudio.sectionCoach.matchesRequirements', {
                                requirements: detail.requirements
                                  .map((item) => item.name)
                                  .join(', '),
                              })}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => generate(true)}
                  disabled={applying}
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {t('ariaStudio.sectionCoach.tryAnotherAngle')}
                </button>
                <button
                  type="button"
                  onClick={apply}
                  disabled={applying || selected.size === 0}
                  className="btn-primary px-5 py-2 text-sm disabled:opacity-50"
                >
                  {applying
                    ? t('cvBuilder.askAria.applying')
                    : t('cvBuilder.askAria.applyN', { n: selected.size })}
                </button>
              </div>
            </div>
          </AriaCard>
        )}
      </AnimatePresence>

      {/* The coach's own input lives in the DOCKED slot (StudioChat's dockNode), so it
          stays pinned while the messages scroll. Inline fallback covers the one frame
          before the slot attaches (or if StudioChat provided none). */}
      {callComposer ? (dockNode ? createPortal(callComposer, dockNode) : callComposer) : null}
      {/* Mounted only while open, so the "don't show again" box starts unticked every time
          rather than remembering a tick from a dialog the user cancelled. */}
      {callTipsOpen && (
        <AriaCallTipsModal
          open
          settings={callSettings}
          onSettingsChange={changeCallSettings}
          onStart={startFromTips}
          onCancel={() => setCallTipsOpen(false)}
        />
      )}
      {composer ? (dockNode ? createPortal(composer, dockNode) : composer) : null}
    </>
  );
};

export default SectionCoach;
