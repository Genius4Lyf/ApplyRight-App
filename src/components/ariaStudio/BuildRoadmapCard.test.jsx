// @vitest-environment jsdom
//
// The plan card is the Studio's only universal fork: the opening chooser AND the
// sidebar's "New CV" both land here, which is why the upload option lives on it rather
// than on a card only one of those routes passes through.
//
// The two things worth pinning: the price is on the button (nobody should choose a file
// and only then find out it costs), and a surface that doesn't offer uploading is
// entirely unaffected.
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import i18n from '../../i18n';
import { CREDIT_COSTS } from '../../lib/credits';
import { BUILD_SECTIONS } from '../../lib/studioFlow';
import BuildRoadmapCard from './BuildRoadmapCard';

afterEach(cleanup);

const t = (key, opts) => i18n.t(key, opts);

describe('BuildRoadmapCard — the upload fork', () => {
  it('offers the upload beside "start building"', () => {
    render(<BuildRoadmapCard onStart={vi.fn()} onUploadInstead={vi.fn()} />);

    expect(screen.getByText(t('ariaStudio.buildRoadmap.startBuilding'))).toBeTruthy();
    expect(screen.getByText(t('ariaStudio.buildRoadmap.uploadTitle'))).toBeTruthy();
  });

  it('states the price on the button itself', () => {
    render(<BuildRoadmapCard onStart={vi.fn()} onUploadInstead={vi.fn()} />);

    expect(
      screen.getByText(
        t('ariaStudio.buildRoadmap.uploadCost', { n: CREDIT_COSTS.CREATE_FROM_UPLOAD })
      )
    ).toBeTruthy();
  });

  it('says up front that the CV comes in unchanged', () => {
    // The promise the Studio's import actually keeps — and the reason it differs from the
    // CV builder's upload, which polishes.
    render(<BuildRoadmapCard onStart={vi.fn()} onUploadInstead={vi.fn()} />);

    expect(screen.getByText(t('ariaStudio.buildRoadmap.uploadBody'))).toBeTruthy();
  });

  it('routes the two buttons to their own handlers', () => {
    const onStart = vi.fn();
    const onUploadInstead = vi.fn();
    render(<BuildRoadmapCard onStart={onStart} onUploadInstead={onUploadInstead} />);

    fireEvent.click(screen.getByText(t('ariaStudio.buildRoadmap.uploadTitle')));
    expect(onUploadInstead).toHaveBeenCalledTimes(1);
    expect(onStart).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText(t('ariaStudio.buildRoadmap.startBuilding')));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('renders exactly as before without the upload handler', () => {
    render(<BuildRoadmapCard onStart={vi.fn()} />);

    expect(screen.getByText(t('ariaStudio.buildRoadmap.startBuilding'))).toBeTruthy();
    expect(screen.queryByText(t('ariaStudio.buildRoadmap.uploadTitle'))).toBeNull();
  });

  it('locks both routes while a session is being set up', () => {
    // Two clicks in the same beat would create two drafts — the "two Untitled CV sessions"
    // bug. Both buttons share the one `starting` flag so neither can slip past it.
    const onUploadInstead = vi.fn();
    render(<BuildRoadmapCard onStart={vi.fn()} onUploadInstead={onUploadInstead} starting />);

    fireEvent.click(screen.getByText(t('ariaStudio.buildRoadmap.uploadTitle')));
    expect(onUploadInstead).not.toHaveBeenCalled();
  });
});

describe('BuildRoadmapCard — fitting a phone', () => {
  // The card outgrew a phone viewport, and the chat anchors a new turn to its TOP — so
  // "Start building" and the upload option both fell below the fold, on the one screen
  // size with nothing to say there was more below. The plan now renders twice: a compact
  // line on phones, the numbered list from `sm` up.
  // The card has exactly one of each: the compact plan is a <ul>, the numbered one an
  // <ol>. Selecting by tag rather than by Tailwind class keeps these tests about the two
  // renderings existing, not about which breakpoint utility spells them.
  const lists = () => ({
    compact: document.querySelector('ul'),
    full: document.querySelector('ol'),
  });

  it('offers a compact plan on phones and the numbered one above sm', () => {
    render(<BuildRoadmapCard onStart={vi.fn()} onUploadInstead={vi.fn()} />);

    const { compact, full } = lists();
    expect(compact).toBeTruthy();
    expect(full).toBeTruthy();
    // Exactly one is ever displayed — the other is display:none, so it never doubles up
    // visually or in the accessibility tree.
    expect(full.className).toContain('hidden');
  });

  it('names the same six sections either way', () => {
    render(<BuildRoadmapCard onStart={vi.fn()} onUploadInstead={vi.fn()} />);

    const { compact, full } = lists();
    BUILD_SECTIONS.forEach((s) => {
      expect(compact.textContent).toContain(t(s.labelKey));
      expect(full.textContent).toContain(t(s.labelKey));
    });
    expect(compact.querySelectorAll('li')).toHaveLength(BUILD_SECTIONS.length);
  });

  it('still shows what is already done in the compact plan', () => {
    // A resumed session must not lose its ticks just because the screen is small.
    render(
      <BuildRoadmapCard onStart={vi.fn()} onUploadInstead={vi.fn()} status={{ contact: true }} />
    );

    const contactItem = [...lists().compact.querySelectorAll('li')].find((li) =>
      li.textContent.includes(t('ariaStudio.studioFlow.sections.contact'))
    );
    expect(contactItem.className).toContain('line-through');
    expect(contactItem.textContent).toContain('✓');
  });
});
