// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import i18n from '../../i18n';
import {
  SelectedAnswerBubble,
  StudioPhaseDivider,
  StudioReceipt,
} from './StudioTranscriptEvent';

afterEach(cleanup);

describe('Studio transcript events', () => {
  it('uses the regular response bubble while marking a guided choice as an ARIA response', async () => {
    await i18n.changeLanguage('en');
    render(<SelectedAnswerBubble reduce>Student / recent grad</SelectedAnswerBubble>);

    const selection = screen.getByText('Student / recent grad').closest('[data-transcript-kind]');
    expect(selection?.getAttribute('data-transcript-kind')).toBe('selection');
    expect(selection?.className).toContain('self-end');
    expect(selection?.className).toContain('bg-slate-900');
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
