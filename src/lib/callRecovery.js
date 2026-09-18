// WHAT WENT WRONG, AND WHAT IS STILL POSSIBLE.
//
// Turning a call into bullet points is two requests — bank the transcript, then generate — and
// either can be refused for reasons that are nothing like each other: no credits, the daily
// build ceiling, a deleted role, a dead network. All of them used to surface as one red toast
// reading "couldn't generate bullets", shown to someone who had just spent paid minutes. They
// could not tell a problem they could fix (buy credits) from one they could only wait out
// (tomorrow's cap) from one that would work on a second press (the network).
//
// So the failure is classified once, here, and the card that follows offers only the doors that
// actually lead somewhere for that reason.

/** @typedef {'credits'|'limit'|'gone'|'network'} BankFailure */

/**
 * Why the wrap-up did not happen.
 *
 * Read from the server's own `code` where there is one, because the HTTP status is ambiguous:
 * the API answers 402 for BOTH "you have no credits" and "that is enough building for today",
 * and those need opposite advice.
 *
 * @param {any} err an axios error
 * @returns {BankFailure}
 */
export const bankFailureReason = (err) => {
  const status = err?.response?.status;
  const code = err?.response?.data?.code;

  if (code === 'INSUFFICIENT_CREDITS' || code === 'NEED_CREDITS') return 'credits';
  if (code === 'BUILD_LIMIT_REACHED' || code === 'CHAT_LIMIT_REACHED') return 'limit';
  // The role was deleted mid-call — another tab, or the live preview's Remove.
  if (status === 404) return 'gone';
  // Everything else — a 500, a timeout, a sleeping server, no connection. The common thread
  // is that trying again is a reasonable thing to do, which is not true of the two above.
  return 'network';
};

// How much of their own words to read back. Enough to prove she was listening, short enough
// that nobody has to scroll through their own interview to find the button underneath it.
const MAX_LINES = 5;
const MAX_CHARS = 160;

/**
 * The things THEY said, in their own words, ready to be read back.
 *
 * Their words and no one else's: Aria's questions are not evidence of anything, and a recap
 * that quoted her own prompts back would be claiming she heard things nobody said. Longest
 * first, because in a spoken interview the long answers are the substantive ones and the short
 * ones are "yes", "mhm" and "come again?" — then restored to the order they were said in, so it
 * reads as a conversation rather than a ranking.
 *
 * @param {Array<{role?: string, who?: string, text?: string}>} turns
 * @returns {string[]}
 */
export const callRecapLines = (turns) => {
  const said = (Array.isArray(turns) ? turns : [])
    .map((turn, index) => ({
      index,
      isUser: turn?.role === 'candidate' || turn?.who === 'user',
      text: String(turn?.text || '')
        .replace(/\s+/g, ' ')
        .trim(),
    }))
    .filter((turn) => turn.isUser && turn.text.length > 12);

  return said
    .slice()
    .sort((a, b) => b.text.length - a.text.length)
    .slice(0, MAX_LINES)
    .sort((a, b) => a.index - b.index)
    .map(({ text }) => (text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS).trim()}…` : text));
};

/**
 * Aria's "I was still listening" message, built ENTIRELY ON THE CLIENT.
 *
 * This is the point. The moment it is needed most is the moment the user has no credits — so
 * asking the model to write it is the one thing that cannot work here. Assembled from their own
 * sentences and translated copy instead: free, instant, and impossible to refuse.
 *
 * Markdown, because the chat renders it.
 *
 * @param {object} opts
 * @param {string[]} opts.lines    from callRecapLines
 * @param {string} opts.lead       translated opening, names what went wrong
 * @param {string} opts.heard      translated "here's what I've got" line
 * @param {string} opts.tail       translated "shall we carry on" line
 * @param {string} opts.nothing    translated stand-in for a call with nothing in it
 * @returns {string}
 */
export const callRecapMessage = ({ lines = [], lead, heard, tail, nothing }) => {
  if (!lines.length) return [lead, nothing].filter(Boolean).join('\n\n');
  const list = lines.map((line) => `- ${line}`).join('\n');
  return [lead, heard, list, tail].filter(Boolean).join('\n\n');
};
