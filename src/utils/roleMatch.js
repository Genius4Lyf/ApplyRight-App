// Deterministic CV-vs-Role-Brief coverage. Free, live — "what Aria looks at."
export const roleMatch = (brief, cvData = {}) => {
  const must = (brief?.mustHaves || []).map((k) => k.name).filter(Boolean);
  if (!must.length) return null; // no brief/JD → caller shows the empty state
  const hay = [
    ...(cvData.skills || []).map((s) => s.name || ''),
    ...(cvData.experience || []).map((e) => e.description || ''),
    ...(cvData.projects || []).map((p) => p.description || ''),
    cvData.professionalSummary || '',
  ]
    .join(' ')
    .toLowerCase();
  const has = (k) => hay.includes(String(k).toLowerCase());
  const matched = must.filter(has);
  const missing = must.filter((k) => !has(k));
  return {
    coverage: Math.round((matched.length / must.length) * 100),
    matched,
    missing,
    role: brief.role || '',
    company: brief.company || '',
  };
};
