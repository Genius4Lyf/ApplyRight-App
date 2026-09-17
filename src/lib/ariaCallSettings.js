// How someone wants their Aria call to go. Mirrors applyright-backend/src/config/
// ariaCallSettings.js — keep the lists identical. The server normalises everything it
// receives regardless, so a drift here can only ever show an option that does nothing, never
// send something unlisted to OpenAI.
//
//   depth — WHAT Aria asks: `thorough` digs for the small things people don't count as
//           achievements; `quick` covers the main points and wraps sooner.
//   style — HOW she sounds: friendly / direct / coach. Never what she may write.
//   voice / pace — who speaks, and how fast.

export const DEPTHS = ['thorough', 'quick'];
export const STYLES = ['friendly', 'direct', 'coach'];
export const VOICES = ['marin', 'cedar'];
export const PACES = ['normal', 'slower'];

export const DEFAULT_CALL_SETTINGS = Object.freeze({
  depth: 'thorough',
  style: 'friendly',
  voice: 'marin',
  pace: 'normal',
});

const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);

export const normalizeCallSettings = (raw) => {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    depth: pick(src.depth, DEPTHS, DEFAULT_CALL_SETTINGS.depth),
    style: pick(src.style, STYLES, DEFAULT_CALL_SETTINGS.style),
    voice: pick(src.voice, VOICES, DEFAULT_CALL_SETTINGS.voice),
    pace: pick(src.pace, PACES, DEFAULT_CALL_SETTINGS.pace),
  };
};

// The saved choice, read synchronously from the stored user blob — the profile update
// returns the whole user and user.service merges it back into localStorage, so this is
// current without a request. Anything unreadable falls back to the defaults rather than
// blocking the call button.
export const readStoredCallSettings = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return normalizeCallSettings(user?.settings?.ariaCall);
  } catch {
    return { ...DEFAULT_CALL_SETTINGS };
  }
};

// Has this account turned the pre-call brief off? From the same stored blob, for the same
// reason — and this one replaced a `GET /users/profile` that ran between the tap on "Talk it
// through instead" and the brief being allowed to open. A whole round trip, on the one path
// where the user is waiting and watching, to answer a question the browser already knew.
//
// Written by the "don't show this again" tick through UserService.updateSettings, which merges
// the updated user back into localStorage — so this is current straight after the tick.
//
// Unreadable, or ticked on another device: they see the brief once more. That was always the
// accepted failure here — reading it one time too many costs far less than a first call that
// goes thin for want of it.
export const readStoredHideCallTips = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return !!user?.settings?.hideAriaCallTips;
  } catch {
    return false;
  }
};
