// Interview LOOP gating — mirrors the backend rule (interviewPrep.controller).
// You unlock the next interviewer by reaching INTERVIEW_PASS_SCORE on the current
// one (the "almost there" band). HR / seat 0 is always open; seat i needs seat
// i-1 passed.

export const INTERVIEW_PASS_SCORE = 65;

export const roundsBySeat = (rounds = []) => {
  const m = {};
  (Array.isArray(rounds) ? rounds : []).forEach((r) => {
    if (r && Number.isInteger(r.seatIndex)) m[r.seatIndex] = r;
  });
  return m;
};

export const seatUnlocked = (seatIndex, rounds = [], unlockAll = false) => {
  if (unlockAll) return true; // support-granted override: all interviewers open
  if (!Number.isInteger(seatIndex) || seatIndex <= 0) return true;
  const prev = roundsBySeat(rounds)[seatIndex - 1];
  return !!prev && typeof prev.score === 'number' && prev.score >= INTERVIEW_PASS_SCORE;
};
