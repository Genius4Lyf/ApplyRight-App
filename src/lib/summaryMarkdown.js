// Helpers for reading/replacing the professional-summary section inside the
// optimizedCV markdown. The summary lives under the first heading (## / # / ###)
// whose text contains "summary" (e.g. "## Professional Summary"), and runs until
// the next heading (or end of document).

const isHeading = (line) => /^#{1,3}\s+/.test(line);

// Index of the first summary heading line, or -1.
const findSummaryHeading = (lines) => {
  for (let i = 0; i < lines.length; i += 1) {
    if (isHeading(lines[i]) && lines[i].toLowerCase().includes('summary')) return i;
  }
  return -1;
};

// Index of the next heading after `from`, or lines.length.
const findNextHeading = (lines, from) => {
  for (let i = from; i < lines.length; i += 1) {
    if (isHeading(lines[i])) return i;
  }
  return lines.length;
};

// Return the trimmed body text of the summary section, or '' if there is none.
export function extractSummary(markdown) {
  if (typeof markdown !== 'string' || !markdown) return '';
  const lines = markdown.split('\n');
  const start = findSummaryHeading(lines);
  if (start === -1) return '';
  const end = findNextHeading(lines, start + 1);
  return lines
    .slice(start + 1, end)
    .join('\n')
    .trim();
}

// Replace the summary section's body with `newSummary`, keeping the heading line
// and standard blank-line spacing around it. Returns the markdown unchanged if
// there is no summary section.
export function replaceSummaryInMarkdown(markdown, newSummary) {
  if (typeof markdown !== 'string' || !markdown) return markdown;
  const lines = markdown.split('\n');
  const start = findSummaryHeading(lines);
  if (start === -1) return markdown;
  const end = findNextHeading(lines, start + 1);

  const before = lines.slice(0, start + 1); // up to & including the heading
  const after = lines.slice(end); // the next heading onward (or empty)
  const body = String(newSummary || '').trim();

  // heading → blank → body → blank → (next section)
  const rebuilt = [...before, '', body, ''];
  if (after.length > 0) rebuilt.push(...after);
  return rebuilt.join('\n');
}
