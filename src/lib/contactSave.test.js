// Which contact details Aria offers to remember, and what gets written when she does.
//
// The rule has to be narrow in one direction and generous in the other: never offer to
// save something already saved (an assistant that does that reads as not listening), but
// do notice a value that has actually changed. Both halves are easy to get subtly wrong,
// and neither is visible in a screenshot — which is why they live in a pure module.
import { describe, expect, it } from 'vitest';

import {
  CONTACT_FIELDS,
  contactSaveAllowed,
  contactSavePayload,
  unsavedContactDetails,
} from './contactSave';

const PROFILE = {
  phone: '0803 123 4567',
  location: 'Lagos, Nigeria',
  linkedinUrl: 'linkedin.com/in/ada',
  portfolioUrl: '',
};

describe('unsavedContactDetails', () => {
  it('offers nothing when the profile already has it all', () => {
    const cv = {
      phone: '0803 123 4567',
      address: 'Lagos, Nigeria',
      linkedin: 'linkedin.com/in/ada',
    };
    expect(unsavedContactDetails(cv, PROFILE)).toEqual([]);
  });

  it('offers only what the account is actually missing', () => {
    const cv = {
      phone: '0803 123 4567', // already saved
      website: 'ada.dev', // profile has none
      address: 'Lagos, Nigeria', // already saved
    };
    const rows = unsavedContactDetails(cv, PROFILE);
    expect(rows.map((r) => r.key)).toEqual(['website']);
    expect(rows[0].value).toBe('ada.dev');
  });

  it('notices a value that CHANGED, so a new number is still offered', () => {
    const rows = unsavedContactDetails({ phone: '0701 999 0000' }, PROFILE);
    expect(rows.map((r) => r.key)).toEqual(['phone']);
  });

  it('ignores case and stray whitespace rather than pestering over them', () => {
    // Re-typing the same place with different capitalisation is not a new fact.
    expect(unsavedContactDetails({ address: '  lagos, NIGERIA ' }, PROFILE)).toEqual([]);
  });

  it('never offers a blank', () => {
    expect(unsavedContactDetails({ phone: '   ', website: '' }, PROFILE)).toEqual([]);
  });

  it('treats an empty profile as everything missing', () => {
    const cv = { phone: '1', linkedin: '2', website: '3', address: '4' };
    expect(unsavedContactDetails(cv, {}).map((r) => r.key)).toEqual([
      'phone',
      'linkedin',
      'website',
      'location',
    ]);
  });

  it('survives being handed nothing at all', () => {
    expect(unsavedContactDetails(undefined, undefined)).toEqual([]);
  });
});

describe('contactSavePayload', () => {
  it('writes PROFILE field names, not CV ones', () => {
    // The two sides genuinely disagree: the CV's `address` is the profile's `location`,
    // `linkedin` is `linkedinUrl`, `website` is `portfolioUrl`. Posting CV names would be
    // silently dropped by the server whitelist — the exact failure that lost phone numbers.
    const rows = unsavedContactDetails(
      { phone: '1', linkedin: '2', website: '3', address: '4' },
      {}
    );
    expect(contactSavePayload(rows, ['phone', 'linkedin', 'website', 'location'])).toEqual({
      phone: '1',
      linkedinUrl: '2',
      portfolioUrl: '3',
      location: '4',
    });
  });

  it('writes ONLY what was ticked, so unticking really declines it', () => {
    const rows = unsavedContactDetails({ phone: '1', address: 'Lagos' }, {});
    expect(contactSavePayload(rows, ['phone'])).toEqual({ phone: '1' });
  });

  it('is empty when nothing is ticked', () => {
    const rows = unsavedContactDetails({ phone: '1' }, {});
    expect(contactSavePayload(rows, [])).toEqual({});
  });
});

describe('contactSaveAllowed', () => {
  it('allows by default, and for a profile that could not be read', () => {
    expect(contactSaveAllowed({})).toBe(true);
    expect(contactSaveAllowed(null)).toBe(true);
  });

  it('respects the persisted "don\'t ask again"', () => {
    expect(contactSaveAllowed({ settings: { hideContactSavePrompt: true } })).toBe(false);
  });

  it('is NOT the same as dismissing the card once', () => {
    // "Not now" is caller-side state and must not write this flag.
    expect(contactSaveAllowed({ settings: { hideContactSavePrompt: false } })).toBe(true);
  });
});

describe('the CV↔profile field map', () => {
  it('covers exactly the four details a CV asks for every time', () => {
    expect(CONTACT_FIELDS.map((f) => f.key)).toEqual(['phone', 'linkedin', 'website', 'location']);
  });

  it('maps each to a distinct profile field', () => {
    const profileKeys = CONTACT_FIELDS.map((f) => f.profile);
    expect(new Set(profileKeys).size).toBe(profileKeys.length);
  });
});
