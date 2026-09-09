import { sidebarFill, TEMPLATES } from '../data/templates';

// WILL A MACHINE READ THIS?
//
// A verdict on the DESIGN, not the writing. Deterministic — no model call, no network, no
// credits — because every input is already on screen the moment someone changes a
// control, and a warning that arrives two seconds after the choice is a warning about
// something you have already stopped thinking about.
//
// THE VALUE IS IN WHAT IT DOES NOT SAY. Most "ATS checkers" list six things and three of
// them are folklore, which teaches people to ignore the other three. So this flags only
// what genuinely changes how a parser reads the page, and it says out loud what it
// checked and found fine — otherwise "you're clear" reads as shallow rather than
// considered.
//
// Deliberately NOT flagged, and why:
//
//   TYPEFACE — "serif is unparseable" is a myth. Every face this app offers is either
//   embedded in the PDF or a system font; a parser reads the text layer, not the shapes.
//
//   MARGINS — `narrow` is 1.5rem ≈ 6.4mm. Inside any consumer printer's imageable area,
//   and completely irrelevant to a text extractor.
//
//   PAGE COLOUR — every choice offered is a light tint, and the control is only shown at
//   all on templates where the ground is the single large colour.
//
//   PAGE COUNT — LengthCoach owns that number. Two components with an opinion about the
//   same thing is how they end up disagreeing.

/** Templates that print a photo when the CV has one. Data, so the check is not a list. */
const rendersPhoto = (templateId) =>
  Boolean(TEMPLATES.find((t) => t.id === templateId)?.rendersPhoto);

/**
 * @param {string} templateId
 * @param {object} design    the Design tab's state
 * @param {object} profile   the merged contact profile, for photoUrl
 * @returns {{ level: 'clear'|'caution', notes: Array<{id,title,detail,fix?}>, checked: string[] }}
 */
export function designAtsVerdict(templateId, design = {}, profile = {}) {
  const notes = [];

  // 1. TWO COLUMNS. The one genuinely documented parse failure: an older applicant
  //    tracking system flattens the page to a single text stream, and a sidebar
  //    interleaves with the main column — so a job title lands in the middle of a skills
  //    list. It does not garble the words; it garbles the ORDER, which is worse, because
  //    the output still looks like a CV.
  if (sidebarFill(templateId)) {
    notes.push({
      id: 'columns',
      title: 'Two columns',
      detail:
        'Some older systems read the page as one stream and interleave the sidebar with the main column. Your words survive; their order may not.',
      fix: 'single-column',
    });
  }

  // 2. A PHOTO. Both halves have to be true — the template prints one AND the CV has one
  //    — or this is a warning about something that is not on the page.
  //
  //    This one is a TRADE-OFF, not a fault, and the copy has to say so. A photo is
  //    normal on a Nigerian, German or French CV and is routinely screened out in the US
  //    and UK, where some employers strip it before a human ever sees the file. Telling
  //    someone their own market's convention is wrong would be the check being wrong.
  if (rendersPhoto(templateId) && profile?.photoUrl) {
    notes.push({
      id: 'photo',
      title: 'Photo on the page',
      detail:
        'Expected on a CV in Nigeria, Germany or France; often stripped — occasionally rejected — by employers in the US and UK. Worth knowing which market you are sending this to.',
    });
  }

  // 3. SQUEEZED. Either of these alone is a legitimate choice, and both are offered for
  //    good reasons. Together they are the signature of a CV being compressed to fit
  //    rather than designed, and that is the state worth naming — not because a parser
  //    minds, but because the human after it will.
  if (design.density === 'compact' && design.margins === 'narrow') {
    notes.push({
      id: 'squeezed',
      title: 'Tight on both',
      detail:
        'Compact spacing and narrow margins together. Nothing will fail to read it — but it will look squeezed to the person who does.',
    });
  }

  return {
    level: notes.length ? 'caution' : 'clear',
    notes,
    // Named so a clear verdict reads as considered. These are the things people are told
    // to worry about that this deliberately does not flag.
    checked: ['Layout', 'Photo', 'Typeface', 'Margins', 'Page colour'],
  };
}

export default designAtsVerdict;
