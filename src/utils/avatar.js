// Shared helper for interviewer cards/tiles — name initials (we don't render
// generated headshots; an initials monogram avoids implying a real person/photo).

export const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
