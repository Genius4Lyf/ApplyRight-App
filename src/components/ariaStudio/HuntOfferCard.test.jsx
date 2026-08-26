// @vitest-environment jsdom
//
// The hunt's third entry point — offered once an entry interview closes and its bullets
// have landed. The two things that matter here are behavioural, not visual:
//
//   1. accepting starts the hunt for the requirement the SERVER named (the client never
//      decides what may be asked — see huntOffersForEntry);
//   2. "Not now" dismisses WITHOUT recording anything. Declining an offer is not the same
//      as saying "I've never done this": only the latter is a decline, and only a decline
//      stops the question being asked again.
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HuntOfferCard from './HuntOfferCard';
import i18n from '../../i18n';

afterEach(cleanup);

const NAME = 'Yardi Voyager';

describe('HuntOfferCard', () => {
  it('names the requirement the job asked for', () => {
    render(<HuntOfferCard name={NAME} onAccept={vi.fn()} onDecline={vi.fn()} />);

    expect(
      screen.getByText(i18n.t('ariaStudio.chat.huntOffer.body', { name: NAME }))
    ).toBeTruthy();
    expect(screen.getByText(i18n.t('ariaStudio.chat.huntOffer.eyebrow'))).toBeTruthy();
  });

  it('accepting opens the hunt', () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    render(<HuntOfferCard name={NAME} onAccept={onAccept} onDecline={onDecline} />);

    fireEvent.click(screen.getByText(i18n.t('ariaStudio.chat.huntOffer.accept')));
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onDecline).not.toHaveBeenCalled();
  });

  it('declining dismisses and does nothing else', () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    render(<HuntOfferCard name={NAME} onAccept={onAccept} onDecline={onDecline} />);

    fireEvent.click(screen.getByText(i18n.t('ariaStudio.chat.huntOffer.decline')));
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('offers no route in while something is already running', () => {
    const onAccept = vi.fn();
    render(<HuntOfferCard name={NAME} busy onAccept={onAccept} onDecline={vi.fn()} />);

    fireEvent.click(screen.getByText(i18n.t('ariaStudio.chat.huntOffer.accept')));
    expect(onAccept).not.toHaveBeenCalled();
  });
});
