// Trim a half-typed markdown tail back to the last point that parses cleanly.
//
// Aria's replies type themselves in a few characters at a time. Rendering that slice as
// markdown means the reader watches raw syntax appear and then snap — "**bol" for a couple
// of frames before it becomes bold — which is the very thing the markdown work was meant
// to stop. Healing the tail means partial markup is never put on screen at all.
//
// Only ever removes from the END, so text already on screen never reflows backwards. It
// only grows, which is what makes it read as typing rather than flickering.

export const healTail = (s) => {
  let out = String(s || '');

  // A link whose closing paren has not arrived yet.
  const openLink = out.lastIndexOf('[');
  if (openLink !== -1 && out.indexOf(')', openLink) === -1) out = out.slice(0, openLink);

  // An unclosed code span.
  if ((out.match(/`/g) || []).length % 2) out = out.slice(0, out.lastIndexOf('`'));

  // Bold first: an odd number of ** means the pair is still open.
  if ((out.match(/\*\*/g) || []).length % 2) out = out.slice(0, out.lastIndexOf('**'));
  // Then italics, counting only the asterisks that are not part of a bold marker.
  const singles = out.replace(/\*\*/g, '');
  if ((singles.match(/\*/g) || []).length % 2) out = out.slice(0, out.lastIndexOf('*'));

  // A bullet or number typed with no text after it yet — it would render as an empty list
  // item and then jump when the words land.
  out = out.replace(/(^|\n)[ \t]*(?:[-*+]|\d+\.)[ \t]*$/, '$1');

  return out;
};
