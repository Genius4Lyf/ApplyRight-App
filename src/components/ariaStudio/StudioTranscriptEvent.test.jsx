// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import i18n from '../../i18n';
import { SelectedAnswerBubble, StudioPhaseDivider, StudioReceipt } from './StudioTranscriptEvent';

afterEach(cleanup);

describe('Studio transcript events', () => {
  it('uses the regular response bubble while marking a guided choice as an ARIA response', async () => {
    await i18n.changeLanguage('en');
    render(<SelectedAnswerBubble reduce>Student / recent grad</SelectedAnswerBubble>);

    const selection = screen.getByText('Student / recent grad').closest('[data-transcript-kind]');
    expect(selection?.getAttribute('data-transcript-kind')).toBe('selection');
    expect(selection?.className).toContain('self-end');
    // The GEOMETRY of the ordinary user bubble, not its colour. This assertion used to
    // read bg-slate-900, and the editorial re-theme changed that swatch in five files
    // at once without updating the test — so it has been failing ever since, saying
    // nothing about the behaviour it is named for. What the test actually means by
    // 'the regular response bubble' is that a guided choice gets no special treatment:
    // same side, same shape, same padding as anything the user typed themselves.
    expect(selection?.className).toContain('rounded-[28px]');
    expect(selection?.className).toContain('px-7');
    expect(selection?.className).toContain('py-5');
    expect(screen.getByText('Responded to ARIA interview')).toBeTruthy();
  });

  it('renders completed actions as compact receipts with optional context', () => {
    render(<StudioReceipt reduce title="Added 11 skills" detail="Skills" />);

    const receipt = screen.getByRole('status');
    expect(receipt.getAttribute('data-transcript-kind')).toBe('receipt');
    expect(screen.getByText('Added 11 skills')).toBeTruthy();
    expect(screen.getByText('Skills')).toBeTruthy();
  });

  it('renders scan completion as a transcript divider', () => {
    render(<StudioPhaseDivider reduce>Fit scan complete</StudioPhaseDivider>);

    const divider = screen.getByRole('separator');
    expect(divider.getAttribute('data-transcript-kind')).toBe('phase');
    expect(screen.getByText(/Fit scan complete/)).toBeTruthy();
  });
});
