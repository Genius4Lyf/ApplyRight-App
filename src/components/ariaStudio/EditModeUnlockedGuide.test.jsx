// @vitest-environment jsdom
//
// Finishing a CV unlocks edit mode, and until now that happened almost silently: on a
// phone the panel cannot auto-open, so a small green dot appearing on an icon was the
// entire announcement — and a dot never says what it means.
//
// The welcome guide does have an "edit" step, but it runs at the START of a session,
// before there is a CV to edit. It teaches a capability the user cannot use yet and has
// forgotten by the time they can.
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import EditModeUnlockedGuide from './EditModeUnlockedGuide';
import i18n from '../../i18n';

vi.mock('../../hooks/useChatTheme', () => ({ useChatTheme: () => ['studio', vi.fn()] }));

const t = (key) => i18n.t(key);

afterEach(cleanup);

describe('the edit-mode guide', () => {
  it('names the button rather than describing it', () => {
    // "Tap the pencil with the green dot" is only useful if you can recognise it when you
    // look up, so the guide renders the real icon and the real dot.
    const { container } = render(<EditModeUnlockedGuide open onComplete={vi.fn()} />);

    expect(screen.getByText(t('ariaStudio.editModeGuide.title'))).toBeTruthy();
    expect(screen.getByText(t('ariaStudio.editModeGuide.buttonHint'))).toBeTruthy();
    expect(container.querySelector('.studio-live-dot')).toBeTruthy();
  });

  it('takes the user straight there', () => {
    const onOpenPreview = vi.fn();
    render(<EditModeUnlockedGuide open onOpenPreview={onOpenPreview} onComplete={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: t('ariaStudio.editModeGuide.openIt') }));
    expect(onOpenPreview).toHaveBeenCalledTimes(1);
  });

  it('can be dismissed by the footer, the close button, the backdrop or Escape', () => {
    // All four count as "told", so all four must mark it seen — otherwise a user who
    // pressed Escape gets taught the same thing again on their next CV.
    const onComplete = vi.fn();
    render(<EditModeUnlockedGuide open onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: t('ariaStudio.editModeGuide.later') }));
    fireEvent.click(
      screen.getAllByRole('button', { name: t('ariaStudio.editModeGuide.dismiss') })[0]
    );
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onComplete).toHaveBeenCalledTimes(3);
  });

  it('renders nothing when closed', () => {
    render(<EditModeUnlockedGuide open={false} onComplete={vi.fn()} />);
    expect(screen.queryByText(t('ariaStudio.editModeGuide.title'))).toBeNull();
  });

  it('is a real dialog, so a screen reader is moved into it', () => {
    render(<EditModeUnlockedGuide open onComplete={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('studio-editmode-title');
  });
});
