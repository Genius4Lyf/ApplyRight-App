// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18n from '../../i18n';
import PinnedEntryCard from './PinnedEntryCard';

afterEach(cleanup);

const entry = {
  _sortId: 'r1',
  entryType: 'full-time',
  title: 'Secretary',
  company: 'Oyi Nigeria Limited',
  startDate: '2023',
  description: '• Processed transactions\n• Supported clients',
};

describe('PinnedEntryCard applied-bullet guidance', () => {
  it('stays collapsed and opens only when the user follows the review hint', async () => {
    await i18n.changeLanguage('en');
    const onReviewHintOpen = vi.fn();
    render(
      <PinnedEntryCard
        entry={entry}
        typePicked
        reviewHint="Open this role to review it"
        onReviewHintOpen={onReviewHintOpen}
      />
    );

    const cardToggle = screen.getByRole('button', { expanded: false });
    fireEvent.click(screen.getByRole('button', { name: 'Open this role to review it' }));

    expect(cardToggle.getAttribute('aria-expanded')).toBe('true');
    expect(onReviewHintOpen).toHaveBeenCalledTimes(1);
  });

  it('shows the saved-bullet badge without expanding the card', async () => {
    await i18n.changeLanguage('en');
    render(<PinnedEntryCard entry={entry} typePicked messagePulse={1} />);

    expect(screen.getByTitle('2 bullet points saved')).toBeTruthy();
    expect(screen.getByRole('button', { expanded: false })).toBeTruthy();
  });
});
