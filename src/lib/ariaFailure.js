/**
 * A turn that didn't get through.
 *
 * Shared by every Aria surface that writes into the Studio stream — the general chat, a
 * hunt, and the section interview — because they all end at the same place: a mark on the
 * user's OWN message saying it wasn't sent, and a Retry under it.
 *
 * It lives here rather than in StudioChat because SectionCoach reports failures upward
 * and must classify them the same way; two copies of this map is how a 429 ends up
 * reading as "couldn't reach me" on one surface and as a rate limit on the other.
 */

// Reason → what to tell them. RATE_LIMITED is the one this was built for: it used to fall
// through to "couldn't reach me", which reads as a broken connection rather than
// something that clears on its own.
export const FAILURE_TEXT = {
  RATE_LIMITED: 'ariaStudio.chat.failed.rateLimited',
  INSUFFICIENT_CREDITS: 'ariaStudio.chat.proNeedsCredits',
  CHAT_LIMIT_REACHED: 'ariaStudio.chat.chatLimitReached',
  BUILD_LIMIT_REACHED: 'ariaStudio.chat.buildLimitReached',
  UNREACHABLE: 'ariaStudio.chat.chatUnreachable',
};

/**
 * Map a thrown request to the reason we show. A 429 from our limiter carries its own
 * code, but anything in front of us (a proxy, a platform limiter) can answer 429 with no
 * body of ours — so the status is honoured on its own. Anything else without a code we
 * recognise is treated as unreachable.
 *
 * @param {any} e the rejected axios error
 * @returns {keyof FAILURE_TEXT}
 */
export const failureReason = (e) => {
  // UNREACHABLE covers two very different things that look identical to the user: a
  // request that never got a response (network, CORS, a 120s timeout, a proxy killing a
  // cold start) and one the server answered 500. The first leaves NOTHING in the backend
  // logs, which is exactly the case that is hard to chase later — so every failed turn
  // leaves its status and code in the browser console, where it can still be read after
  // the fact. One line, only on failure.
  console.error('[aria] turn failed', {
    status: e?.response?.status ?? null,
    code: e?.response?.data?.code ?? null,
    message: e?.message || '',
  });
  const code = e?.response?.data?.code;
  if (code && FAILURE_TEXT[code]) return code;
  if (e?.response?.status === 429) return 'RATE_LIMITED';
  return 'UNREACHABLE';
};
