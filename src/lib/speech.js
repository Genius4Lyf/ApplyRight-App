// Thin wrappers around the browser Web Speech APIs, with graceful degradation.
//
// - SpeechRecognition (voice INPUT) is NOT available in the Capacitor Android
//   WebView, so callers should hide the mic when `isSpeechRecognitionSupported()`
//   is false rather than show a button that errors. Full native voice input on
//   Android requires a Capacitor plugin (e.g. @capacitor-community/speech-recognition)
//   + mic permission + `npx cap sync`, then device testing.
// - TTS (speechSynthesis) is broadly supported, including most WebViews, so the
//   "hear the question" feature works on web and typically on Android too.

export const getSpeechRecognition = () =>
  (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) ||
  null;

export const isSpeechRecognitionSupported = () => !!getSpeechRecognition();

export const isTTSSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

// Speak `text` aloud, cancelling anything already playing. No-op if unsupported.
export const speak = (text) => {
  if (!isTTSSupported() || !text || !text.trim()) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* no-op */
  }
};

export const stopSpeaking = () => {
  if (!isTTSSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* no-op */
  }
};
