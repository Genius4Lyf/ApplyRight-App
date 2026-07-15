// Interview LOOP access — mirrors the backend: Premium users pick any panel
// interviewer in any order. There is no score-based sequential unlock. The
// separate readiness gate (computeInterviewGate) still governs whether the loop
// is startable at all. seatUnlocked is kept as an always-true helper (name +
// signature preserved) so its callers keep working.

export const roundsBySeat = (rounds = []) => {
  const m = {};
  (Array.isArray(rounds) ? rounds : []).forEach((r) => {
    if (r && Number.isInteger(r.seatIndex)) m[r.seatIndex] = r;
  });
  return m;
};

// eslint-disable-next-line no-unused-vars
export const seatUnlocked = (seatIndex, rounds = [], unlockAll = false) => true;
