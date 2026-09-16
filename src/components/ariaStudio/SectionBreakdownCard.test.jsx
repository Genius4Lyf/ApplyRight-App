// @vitest-environment jsdom
//
// A verdict has to have a door.
//
// The per-section Fix button belongs to the parked tailoring loop, so with
// STUDIO_TAILORING_ENABLED off a section scored amber carried a score, a note, and the
// only control on the row was "Doesn't apply to me" — an invitation to opt OUT of being
// measured on the very thing the user had just paid to be told about. These pin the way
// back in, and they pin it INDEPENDENTLY of the flag, which nothing else in the suite did.
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import i18n from '../../i18n';
import { STUDIO_TAILORING_ENABLED } from '../../lib/studioFeatures';
import SectionBreakdownCard from './SectionBreakdownCard';

afterEach(cleanup);

const t = (key, opts) => i18n.t(key, opts);

const SECTIONS = [
  { key: 'experience', label: 'Work history', band: 'warn', score: 52, noteKey: 'tooThin' },
  { key: 'summary', label: 'Summary', band: 'bad', score: 21, noteKey: 'missing' },
  { key: 'education', label: 'Education', band: 'ok', score: 88, noteKey: 'complete' },
];

describe('SectionBreakdownCard — the way back in', () => {
  it('offers a reopen on every section that needs work', () => {
    render(<SectionBreakdownCard sections={SECTIONS} onReopen={vi.fn()} />);

    // Two rows need work; the green one must not offer to be reopened.
    expect(screen.getAllByText(t('ariaStudio.sectionBreakdown.reopen'))).toHaveLength(2);
  });

  it('hands back the whole section, so the caller can route by key', () => {
    const onReopen = vi.fn();
    render(<SectionBreakdownCard sections={SECTIONS} onReopen={onReopen} />);

    fireEvent.click(screen.getAllByText(t('ariaStudio.sectionBreakdown.reopen'))[0]);

    expect(onReopen).toHaveBeenCalledTimes(1);
    expect(onReopen.mock.calls[0][0].key).toBe('experience');
  });

  it('never offers a door that leads nowhere', () => {
    // A key the build flow has no step for must render no button at all, rather than one
    // that quietly does nothing.
    render(
      <SectionBreakdownCard
        sections={[{ key: 'invented', label: 'Invented', band: 'bad', score: 10 }]}
        onReopen={vi.fn()}
      />
    );

    expect(screen.queryByText(t('ariaStudio.sectionBreakdown.reopen'))).toBeNull();
  });

  it('leaves a dismissed section alone', () => {
    render(
      <SectionBreakdownCard
        sections={[{ ...SECTIONS[0], dismissed: true, band: 'neutral', score: null }]}
        onReopen={vi.fn()}
      />
    );

    expect(screen.queryByText(t('ariaStudio.sectionBreakdown.reopen'))).toBeNull();
  });

  it('is not the parked tailoring loop', () => {
    // The whole point: this action exists while Fix does not. If the flag is ever flipped
    // back on, Fix takes the row and this assertion flips with it — deliberately, so the
    // two can never both claim the primary action on one row.
    render(<SectionBreakdownCard sections={SECTIONS} onFix={vi.fn()} onReopen={vi.fn()} />);

    const fixes = screen.queryAllByText(t('ariaStudio.sectionBreakdown.fix'));
    const reopens = screen.queryAllByText(t('ariaStudio.sectionBreakdown.reopen'));
    if (STUDIO_TAILORING_ENABLED) {
      expect(fixes).toHaveLength(2);
      expect(reopens).toHaveLength(0);
    } else {
      expect(fixes).toHaveLength(0);
      expect(reopens).toHaveLength(2);
    }
  });
});
