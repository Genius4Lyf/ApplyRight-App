// Records a live realtime interview to a single audio file. The user's mic and
// the AI's voice are two separate MediaStreams; a bare WebRTC remote track can't
// be recorded directly, so we mix both through Web Audio into one destination and
// record that. Used by the realtime path only (the turn-based fallback isn't
// recorded). Cannot be unit-tested in jsdom (no MediaRecorder / AudioContext).

const pickMime = () => {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';
};

/**
 * Start recording the mixed (user + AI) audio.
 * @returns {{ stop: () => Promise<Blob|null> }} stop() resolves the recording blob.
 */
export function createMixedRecorder(localStream, remoteStream) {
  let ctx;
  let recorder;
  const chunks = [];

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioCtx();
    const dest = ctx.createMediaStreamDestination();
    if (localStream) ctx.createMediaStreamSource(localStream).connect(dest);
    if (remoteStream) ctx.createMediaStreamSource(remoteStream).connect(dest);
    // NOTE: never connect to ctx.destination — that would echo the mic to speakers.

    const mimeType = pickMime();
    recorder = new MediaRecorder(dest.stream, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    recorder.start(1000); // gather in ~1s chunks so a crash loses little
  } catch {
    // Recording is best-effort — if it can't start, stop() just resolves null.
    return { stop: async () => null };
  }

  const stop = () =>
    new Promise((resolve) => {
      const finish = () => {
        try {
          ctx && ctx.close();
        } catch {
          /* noop */
        }
        if (!chunks.length) return resolve(null);
        resolve(new Blob(chunks, { type: chunks[0].type || 'audio/webm' }));
      };
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = finish;
        try {
          recorder.stop();
        } catch {
          finish();
        }
      } else {
        finish();
      }
    });

  return { stop };
}
