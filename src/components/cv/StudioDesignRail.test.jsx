// @vitest-environment jsdom
//
// THE PANEL, NOW THAT IT IS ONE COMPONENT IN TWO HOMES.
//
// It used to be a single <div> switching between an inline column and a bottom drawer
// through `fixed lg:relative` class toggles. Extracting it is what let the phone get a
// real sheet — portal, focus trap, Escape, Android back — without touching the desktop
// column. These tests hold the parts of that split that are easy to lose later: that the
// body does not care which host it is in, and that ACCENT is gone for good.
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));
// The thumbnail renders a whole CV through the template pipeline; irrelevant here and
// slow enough to matter across a dozen tiles.
vi.mock('../TemplatePreviewThumb', () => ({
  default: ({ templateId }) => <div data-testid={`thumb-${templateId}`} />,
}));

import StudioDesignRail from './StudioDesignRail';
import { TEMPLATES } from '../../data/templates';

const baseProps = {
  application: { fitScore: 62, jobTitle: 'Data Analyst' },
  isDraftMode: true,
  activeTab: 'resume',
  atsReadiness: null,
  userProfile: { plan: 'paid' },
  railTab: 'design',
  setRailTab: vi.fn(),
  insightsOpen: true,
  setInsightsOpen: vi.fn(),
  templateGroup: 'Simple',
  setTemplateGroup: vi.fn(),
  design: { margins: 'normal', density: 'normal', font: '', paper: 'a4', ground: '' },
  setDesign: vi.fn(),
  templateId: 'ats-clean',
  onSelectTemplate: vi.fn(),
  isUnlocked: () => true,
  navigate: vi.fn(),
};

const mount = (props = {}) => render(<StudioDesignRail {...baseProps} {...props} />);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('StudioDesignRail — the Design tab', () => {
  // The labels are locale keys now, and `t` is mocked to return its key — so these read
  // as key paths rather than English. That is the point: it asserts the control is wired
  // to a translated string, which a hardcoded label would not be.
  it('offers the controls that actually change the document', () => {
    mount();
    [
      'cvStudio.designPanel.typeface',
      'cvStudio.designPanel.textSize',
      'cvStudio.designPanel.sectionGap',
      'cvStudio.designPanel.margins',
      'cvStudio.designPanel.paperSize',
      'cvStudio.designPanel.lineHeight',
    ].forEach((label) => {
      expect(screen.getByText(label)).toBeTruthy();
    });
  });

  it('withholds text size on a sidebar template rather than showing a dead control', () => {
    // The print clone pins a sidebar with `position: fixed` so Chrome repeats it per page,
    // and the text scale is a `zoom` — an unknown combination that would misbehave in the
    // PDF only. Absent, not disabled: a greyed control invites a question with no answer.
    mount({ templateId: 'ats-clean' });
    expect(screen.getByText('cvStudio.designPanel.textSize')).toBeTruthy();
    cleanup();
    const sidebarId = TEMPLATES.find((t) => t.sidebar).id;
    mount({ templateId: sidebarId });
    expect(screen.queryByText('cvStudio.designPanel.textSize')).toBeNull();
    // Section spacing is not zoom-based, so it stays available on every template.
    expect(screen.getByText('cvStudio.designPanel.sectionGap')).toBeTruthy();
  });

  it('has no accent control at all', () => {
    // It set --cv-accent, which SIX of the nineteen templates read — every one of them
    // as var(--cv-accent, <its own hex>). So on thirteen it did nothing whatsoever, and
    // on the other six it did nothing until touched. A control that is a no-op on most
    // of the catalogue teaches people the panel does not work.
    mount();
    expect(screen.queryByText('Accent')).toBeNull();
    expect(screen.queryByLabelText('Burgundy')).toBeNull();
    expect(screen.queryByLabelText('Indigo')).toBeNull();
  });

  it('does not carry the CV name either', () => {
    // Not a design control, and it put the page's only rename behind a drawer. It is the
    // page heading now.
    mount();
    expect(screen.queryByText('CV name')).toBeNull();
  });

  it('hides Page colour on a template whose ground is not the only large colour', () => {
    // supportsGround is an allowlist of five. The control is ABSENT rather than
    // disabled on the rest — a greyed-out swatch invites a question with no answer.
    mount({ templateId: 'ats-clean' });
    expect(screen.getByText('cvStudio.designPanel.pageColour')).toBeTruthy();
    cleanup();
    mount({ templateId: 'applyright-navy' });
    expect(screen.queryByText('cvStudio.designPanel.pageColour')).toBeNull();
  });
});

describe('StudioDesignRail — picking a template', () => {
  const openTemplates = (props = {}) => mount({ railTab: 'templates', ...props });

  it('hands the id up rather than setting it itself', () => {
    const onSelectTemplate = vi.fn();
    openTemplates({ onSelectTemplate });
    const simple = TEMPLATES.filter((t) => t.group === 'Simple');
    fireEvent.click(screen.getByText(simple[0].name).closest('div[class*="cursor-pointer"]'));
    expect(onSelectTemplate).toHaveBeenCalledWith(simple[0].id);
  });

  it('dismisses the sheet when it IS a sheet, and cannot when it is not', () => {
    // The same body serves both hosts, so "a pick should close this" is the host's
    // opinion, arriving as onClose. The column passes none — there is nothing to close,
    // and a column that dismissed itself on every pick would be unusable.
    const onClose = vi.fn();
    const simple = TEMPLATES.filter((t) => t.group === 'Simple');

    openTemplates({ onClose });
    fireEvent.click(screen.getByText(simple[0].name).closest('div[class*="cursor-pointer"]'));
    expect(onClose).toHaveBeenCalledTimes(1);

    cleanup();
    // No onClose at all — the inline column. Must not throw.
    openTemplates();
    expect(() =>
      fireEvent.click(screen.getByText(simple[0].name).closest('div[class*="cursor-pointer"]'))
    ).not.toThrow();
  });

  it('shows one family at a time, behind its filter chips', () => {
    openTemplates({ templateGroup: 'Simple' });
    const simple = TEMPLATES.filter((t) => t.group === 'Simple');
    const editorial = TEMPLATES.filter((t) => t.group === 'Editorial');
    simple.forEach((t) => expect(screen.getByText(t.name)).toBeTruthy());
    editorial.forEach((t) => expect(screen.queryByText(t.name)).toBeNull());
  });
});

describe('StudioDesignRail — it does not know which host it is in', () => {
  it('renders exactly the same body with and without onClose', () => {
    // The whole point of the extraction: the column and the sheet must not drift into
    // two different panels. If a future change makes the body branch on its host, this
    // is what catches it.
    const { container: inline } = mount();
    const withoutClose = inline.innerHTML;
    cleanup();
    const { container: sheet } = mount({ onClose: vi.fn() });
    expect(sheet.innerHTML).toBe(withoutClose);
  });

  it('is a scroll container and nothing else — its host owns the frame', () => {
    // No width, no position, no background: those belong to the column and the sheet,
    // which are different in each. A width here would fight the full-bleed sheet.
    const { container } = mount();
    const root = container.firstChild;
    expect(root.className).toContain('overflow-y-auto');
    expect(root.className).not.toMatch(/\bw-96\b|\bfixed\b|\bbg-white\b/);
  });
});
