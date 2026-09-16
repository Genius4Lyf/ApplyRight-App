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

describe('BuildRoadmapCard — the plan', () => {
  // It used to render the six sections TWICE: a numbered column from `sm` up and a flowing
  // "Contact · Work history · …" line on phones, because six full-height rows pushed the
  // card's two actual choices below a phone fold. The flowing version fixed the height and
  // broke the shape — six items wrapped three, then two, then one, so a fixed list looked
  // like a ragged paragraph. One two-column grid is three even rows: short enough for the
  // phone case, uniform at every width, and one rendering to keep honest instead of two.
  const plan = () => document.querySelector('ol');

  it('lays the six sections out two per row, once', () => {
    render(<BuildRoadmapCard onStart={vi.fn()} onUploadInstead={vi.fn()} />);

    // One list, not two — the old split is what this replaces.
    expect(document.querySelectorAll('ol')).toHaveLength(1);
    expect(document.querySelector('ul')).toBeNull();
    expect(plan().className).toContain('grid-cols-2');
    expect(plan().querySelectorAll('li')).toHaveLength(BUILD_SECTIONS.length);
  });

  it('names every section', () => {
    render(<BuildRoadmapCard onStart={vi.fn()} onUploadInstead={vi.fn()} />);

    BUILD_SECTIONS.forEach((s) => {
      expect(plan().textContent).toContain(t(s.labelKey));
    });
  });

  it('marks a section already done with a drawn tick, not a struck emoji', () => {
    // A resumed session must not lose its ticks.
    render(
      <BuildRoadmapCard onStart={vi.fn()} onUploadInstead={vi.fn()} status={{ contact: true }} />
    );

    const contactItem = [...plan().querySelectorAll('li')].find((li) =>
      li.textContent.includes(t('ariaStudio.studioFlow.sections.contact'))
    );
    expect(contactItem.querySelector('.line-through')).toBeTruthy();
    // The marker is an icon now, so it carries no text — asserting on a '✓' character
    // would quietly pass against a section that had lost its badge entirely.
    expect(contactItem.querySelector('svg')).toBeTruthy();
  });

  it('gives every section a drawn icon rather than an emoji', () => {
    render(<BuildRoadmapCard onStart={vi.fn()} onUploadInstead={vi.fn()} />);

    // Emoji draw at their own intrinsic size and differ per platform, so a row of them is a
    // row of mismatched heights that looks like three different products across OSes.
    plan()
      .querySelectorAll('li')
      .forEach((li) => expect(li.querySelector('svg')).toBeTruthy());
  });
});
