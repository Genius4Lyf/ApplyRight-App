// @vitest-environment jsdom
//
// How CVTemplateRenderer resolves a templateId — the three cases that matter, and the
// reason the third one is no longer silent.
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import CVTemplateRenderer from './CVTemplateRenderer';

const MARKDOWN = `# Ada Lovelace

## Professional Summary
Analytical engine specialist.

## Work Experience
### Mathematician | Analytical Society | 1840 - 1852
- Wrote the first published algorithm
`;

const renderCv = (templateId) =>
  render(
    <CVTemplateRenderer
      application={{ optimizedCV: MARKDOWN, templateId, outputLang: 'en' }}
      userProfile={{ fullName: 'Ada Lovelace', email: 'ada@example.com' }}
    />
  );

let warn;
beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  warn.mockRestore();
  cleanup();
});

describe('CVTemplateRenderer — resolving a template', () => {
  it('renders a CURRENT template rather than falling back', () => {
    // The shipped bug: 'modern-professional' was absent from this component's own map, so
    // it resolved to ATS Clean. Its distinguishing mark is its warm paper.
    const { container } = renderCv('modern-professional');

    expect(screen.getByText(/Analytical engine specialist/)).toBeTruthy();
    expect(container.querySelector('.bg-\\[\\#f7f6f2\\]')).toBeTruthy();
    expect(warn).not.toHaveBeenCalled();
  });

  it('still renders a LEGACY id the picker no longer offers', () => {
    // A CV saved before the 29→19 prune still carries its old id. Those documents must
    // keep rendering as their owners designed them — which is why the legacy map stays.
    renderCv('luxury-gold');

    expect(screen.getByText(/Analytical engine specialist/)).toBeTruthy();
    expect(warn).not.toHaveBeenCalled();
  });

  it('falls back for an id nothing knows — and SAYS so', () => {
    // Falling back is right: a CV must render something. Doing it silently is what let
    // three live templates render as the wrong document for months.
    renderCv('a-template-that-never-existed');

    expect(screen.getByText(/Analytical engine specialist/)).toBeTruthy();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('a-template-that-never-existed'));
  });

  it('does not paint a background over the page beneath it', () => {
    // This wrapper sits BETWEEN the A4 page shell and the template. It used to be
    // bg-white, which covered the tinted page and produced the hard white block below a
    // short CV. The page owns the paper colour; this owns layout only.
    const { container } = renderCv('modern-professional');

    const wrapper = container.querySelector('.cv-template-container');
    expect(wrapper).toBeTruthy();
    expect(wrapper.className).not.toContain('bg-white');
  });
});
