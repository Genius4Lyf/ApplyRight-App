// The shipped section-intro artwork, checked as an asset rather than as a component.
//
// The art is third-party (unDraw), recoloured once and committed. Recolouring is a
// find-and-replace over a known list of source colours, which means the failure mode is
// silent: a replacement illustration that happens to use a colour the map has never seen
// passes straight through and ships as-is. That is exactly how a purple #3a3768 and a
// white-hair #e6e8ec reached the tree during this feature's own development — the files
// looked fine, the build was green, and the only symptom was an indigo shape in an app
// that deliberately has no indigo left.
//
// So the palette is pinned. Every colour in every file must be one the recolour produces.
// If you swap in new art and this fails, the answer is to extend the mapping (documented in
// index.css) and regenerate — not to widen this list.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { SECTION_INTRO } from '../../lib/sectionIntro';

const ART_DIR = join(process.cwd(), 'public', 'section-art');

// What the recolour emits, per variant. Nothing else may appear in a shipped file.
const LIGHT = [
  '#f59e0b', // accent
  '#0f172a',
  '#334155',
  '#475569', // ink / clothing / outlines
  '#cbd5e1',
  '#e2e8f0',
  '#f1f5f9',
  '#fff',
  '#ffffff', // greys / paper
  '#a9714b',
  '#7a4f2e', // skin
];
const DARK = [
  '#fbbf24',
  '#405066',
  '#64748b',
  '#8595ab',
  '#2b3c58',
  '#1f2f49',
  '#16233a',
  '#0f1a2e',
  '#b9805a',
  '#8a5a36',
];

const files = () => readdirSync(ART_DIR).filter((f) => f.endsWith('.svg'));
const coloursIn = (file) => [
  ...new Set(
    (readFileSync(join(ART_DIR, file), 'utf8').match(/#[0-9a-fA-F]{3,6}\b/g) || []).map((c) =>
      c.toLowerCase()
    )
  ),
];

describe('section art — the files that ship', () => {
  it('has a light and a dark variant for every section that declares art', () => {
    const declared = Object.values(SECTION_INTRO)
      .map((s) => s.art)
      .filter(Boolean);
    expect(declared.length).toBeGreaterThan(0);

    declared.forEach((art) => {
      // A missing file is not a build error — a CSS background just silently paints
      // nothing, leaving an empty band no test would otherwise notice.
      expect(existsSync(join(ART_DIR, `${art}-light.svg`)), `${art}-light.svg`).toBe(true);
      expect(existsSync(join(ART_DIR, `${art}-dark.svg`)), `${art}-dark.svg`).toBe(true);
    });
  });

  it('uses ONLY the recoloured palette — no unDraw purple, no stray tone', () => {
    const offenders = [];
    files().forEach((file) => {
      const allowed = file.includes('-light') ? LIGHT : DARK;
      const stray = coloursIn(file).filter((c) => !allowed.includes(c));
      if (stray.length) offenders.push(`${file}: ${stray.join(' ')}`);
    });

    expect(offenders).toEqual([]);
  });

  it('never ships unDraw’s own accent or default skin tone', () => {
    // Stated separately from the palette check so the failure names the actual sin rather
    // than "unexpected colour": #6c63ff is the indigo this app removed everywhere else, and
    // the pink family is the pale default skin an NG-first product should not inherit.
    const banned = ['#6c63ff', '#ff6363', '#ffb6b6', '#ffb8b8', '#ffb9b9', '#ed9da0', '#9f616a'];
    files().forEach((file) => {
      const found = coloursIn(file).filter((c) => banned.includes(c));
      expect(found, file).toEqual([]);
    });
  });

  it('keeps every illustration landscape, so it fills the fixed band', () => {
    // The band sizes art by HEIGHT. A portrait drawing shrinks to a sliver floating in the
    // middle of a wide band, which is why several thematically perfect pieces were rejected.
    files().forEach((file) => {
      const vb = readFileSync(join(ART_DIR, file), 'utf8').match(/viewBox="([^"]+)"/);
      expect(vb, `${file} has no viewBox`).toBeTruthy();
      const [, , w, h] = vb[1].trim().split(/\s+/).map(Number);
      expect(w / h, `${file} aspect ratio`).toBeGreaterThan(1.15);
    });
  });
});
