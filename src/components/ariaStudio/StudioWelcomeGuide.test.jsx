// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '../../i18n';
import StudioWelcomeGuide from './StudioWelcomeGuide';

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

afterEach(cleanup);

describe('StudioWelcomeGuide', () => {
  it('explains the Studio-to-Builder workflow and finishes after the final step', async () => {
    const onComplete = vi.fn();
    render(<StudioWelcomeGuide open onComplete={onComplete} />);

    expect(screen.getByRole('heading', { name: 'Welcome to your CV workspace.' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Three areas work together while you edit.' })
      ).toBeTruthy()
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Adding a new role or project? Use CV Builder.' })
      ).toBeTruthy()
    );
    fireEvent.click(screen.getByRole('button', { name: 'Start using Studio' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('lets a user dismiss the guide at any point', () => {
    const onComplete = vi.fn();
    render(<StudioWelcomeGuide open onComplete={onComplete} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Skip guide' })[0]);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
