import { useEffect, useMemo, useRef, useState } from 'react';
import CVService from '../services/cv.service';

// How long to wait after a content change before recomputing coverage. Long enough that a
// burst — applying four bullets, then a skill, then the summary — coalesces into ONE call;
// short enough that the number is current by the time anyone looks up at it.
const DEBOUNCE_MS = 800;

// Live "how much of this job can my CV defend yet?" for Aria Studio.
//
// Deliberately built on POST /ai/keyword-coverage: free, no AI, no charge, and it writes
// NOTHING to the draft. That last part matters — /studio/recompute would also produce a
// number, but it persists studioScan, which is the tailor track's state and must not appear
// on a build. A passive tracker that spends a credit or mutates the document would be worse
// than no tracker at all.
//
// Matching is the shared normalizer (synonyms, fuzzy, and the JD's OWN aliases), so a
// posting that says "Yardi Voyager" still counts a CV that says "Yardi", and "Java" never
// counts "JavaScript".
//
// Returns { coverage, keywords, ready }:
//   coverage  { results, covered, total, mustHaveCovered, mustHaveTotal } | null
//   keywords  what was sent, so callers can join results back to the typed requirement
//   ready     there is a brief with must-haves — i.e. there is a target to show at all
export function useJobCoverage(cvData) {
  const [coverage, setCoverage] = useState(null);
  const requestRef = useRef(0);

  const brief = cvData?.targetJob?.brief;

  // must-haves FIRST so the target group leads the checklist. Both arrays carry `aliases`,
  // which is what lets the JD's own second name for a thing count.
  const keywords = useMemo(() => {
    const take = (list, importance) =>
      (Array.isArray(list) ? list : [])
        .map((k) => (typeof k === 'string' ? { name: k } : k))
        .filter((k) => k?.name)
        .map((k) => ({
          name: k.name,
          importance: k.importance || importance,
          aliases: Array.isArray(k.aliases) ? k.aliases : [],
        }));
    return [...take(brief?.mustHaves, 'must_have'), ...take(brief?.niceToHaves, 'nice_to_have')];
  }, [brief]);

  // Everything a requirement could honestly be matched against: the bullets the user has
  // built, plus the summary. Titles and companies are deliberately excluded — a requirement
  // is not met by a job title that happens to contain the word.
  const text = useMemo(() => {
    const descriptions = [...(cvData?.experience || []), ...(cvData?.projects || [])]
      .map((e) => e?.description || '')
      .filter(Boolean);
    return [...descriptions, cvData?.professionalSummary || ''].filter(Boolean).join('\n');
  }, [cvData?.experience, cvData?.projects, cvData?.professionalSummary]);

  const skills = useMemo(
    () => (cvData?.skills || []).map((s) => (typeof s === 'string' ? s : s?.name)).filter(Boolean),
    [cvData?.skills]
  );

  const ready = keywords.some((k) => k.importance === 'must_have');

  // Keyed on the CONTENT, not on object identity — the context hands back a fresh cvData on
  // every autosave, and refetching on each of those would hammer the endpoint for nothing.
  const signature = `${keywords.map((k) => k.name).join('|')}::${text}::${skills.join('|')}`;

  useEffect(() => {
    if (!ready) {
      setCoverage(null);
      return undefined;
    }
    const handle = setTimeout(async () => {
      const reqId = ++requestRef.current;
      try {
        const data = await CVService.getKeywordCoverage(keywords, { text, skills });
        // A slower earlier response must never overwrite a newer one.
        if (reqId === requestRef.current) setCoverage(data);
      } catch {
        // Keep the last good number. A tracker that blanks out on a dropped request reads
        // as "you lost progress", which is both alarming and false.
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // `keywords`/`text`/`skills` are all captured by `signature`; depending on them directly
    // would re-fire on every identity change the memos cannot prevent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, ready]);

  return { coverage, keywords, ready };
}

export default useJobCoverage;
