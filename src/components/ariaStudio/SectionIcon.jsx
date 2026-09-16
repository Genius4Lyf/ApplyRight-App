import React from 'react';
import {
  Award,
  Briefcase,
  Contact,
  FolderKanban,
  GraduationCap,
  PenLine,
  Wrench,
} from 'lucide-react';

// ONE DRAWN ICON PER CV SECTION, replacing the emoji that used to stand in for it.
//
// Emoji were never really a choice — they were the only glyph available to `studioFlow.js`,
// which is pure JS shared with non-React callers and cannot hold JSX. The cost showed
// everywhere they rendered: an emoji ignores the font-size of the label it sits in and
// draws at its own intrinsic size, so a row of them is a row of mismatched heights, and
// each platform paints its own artwork — the same CV plan looks like three different
// products on Windows, macOS and Android.
//
// Lucide strokes inherit `currentColor` and the box you give them, so a section marker now
// sits at the same weight as the text beside it and looks the same everywhere.
//
// studioFlow.js keeps its `icon` emoji: it is still the fallback for any caller that can't
// render a component, and removing it would be a change to a pure module for a presentation
// reason.
const ICONS = {
  contact: Contact,
  experience: Briefcase,
  // Both spellings: the command channel says 'project' (singular), cvData says 'projects'.
  project: FolderKanban,
  projects: FolderKanban,
  education: GraduationCap,
  certs: Award,
  skills: Wrench,
  summary: PenLine,
};

// `aria-hidden` by default: every place this renders, the section's name is already in the
// text beside it, so announcing the icon would just read the label twice.
const SectionIcon = ({ section, className = 'w-4 h-4' }) => {
  const Glyph = ICONS[section];
  if (!Glyph) return null;
  return <Glyph className={className} aria-hidden="true" />;
};

export default SectionIcon;
