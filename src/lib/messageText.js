// Aria's replies are markdown, and markdown is not what anyone wants on their clipboard.
//
// Copying a reply verbatim hands over `**bold**` and backticks, which then get pasted
// straight into a CV field or a job application. This flattens the syntax and keeps the
// shape — paragraphs stay paragraphs, list items keep their "- " so a copied set of
// bullets is still recognisably a set of bullets.
//
// Deliberately NOT a markdown parser: a regex pass is the right size for chat prose, and
// pulling react-markdown's AST out for this would mean rendering twice.

// Answer starters contain a literal "___" blank ("I identified ___ that led to"). The
// italic rule below must never eat it, which is why it requires non-underscore content
// and refuses to sit next to another underscore.
const ITALIC_UNDERSCORE = /(?<!_)_([^_\n]+)_(?!_)/g;

/**
 * Markdown → plain text, for the clipboard.
 * @param {string} md
 * @returns {string}
 */
export const toPlainText = (md) =>
  String(md || '')
    // Links first — the label is the useful half, the URL is worth keeping in brackets.
    .replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, '$1 ($2)')
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '$1')
    .replace(ITALIC_UNDERSCORE, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    // Block markers at the start of a line only, so a mid-sentence "#" survives.
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    // A reveal can leave a lone marker behind; three or more blank lines is never intended.
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export default toPlainText;
