// @vitest-environment jsdom
//
// The door Edit-with-Aria walks through.
//
// Every other way of arriving at the Studio with a session already decided deliberately
// STARTS A NEW ONE — coming through a door that names what you came to do should not drop
// you back into last week's CV. `openDraft` is the exception, and it has to be: it names
// the document, and the whole value of editing an Aria CV with Aria is the transcript that
// wrote it. If this ever degraded into `newSession`, Edit would silently open a blank
// conversation and the user would lose exactly what they came back for — with no error to
// tell them so. That is the regression these tests exist to catch.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const loadSession = vi.fn();
const newSession = vi.fn();
const openApplication = vi.fn();
const setPanelView = vi.fn();

// The bound document, mutated between renders to stand in for loadSession landing.
// Read lazily inside the mock factories, never at hoist time.
let studio = { cvData: null, draftId: null };

let routerState = null;

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useLocation: () => ({ pathname: '/aria-studio', state: routerState }) };
});

vi.mock('../../context/AriaStudioContext', () => ({
  AriaStudioProvider: ({ children }) => <>{children}</>,
  useAriaStudio: () => ({
    cvData: studio.cvData,
    draftId: studio.draftId,
    applicationId: null,
    loadSession,
    openApplication,
    newSession,
    flushChats: vi.fn(),
    sessionNonce: 0,
    renameCv: vi.fn(),
    updateCvData: vi.fn(),
  }),
}));

vi.mock('../../hooks/useStudioLayout', () => ({
  useStudioLayout: () => ({
    isMobile: false,
    railInline: true,
    panelInline: false,
    railOpen: true,
    setRailOpen: vi.fn(),
    panelView: null,
    // Stable across renders, exactly as the real hook's useCallback setter is — the
    // effect under test names it in its dep array.
    setPanelView,
    closePreview: vi.fn(),
    railOverlay: false,
    setRailOverlay: vi.fn(),
    panelOverlay: false,
    setPanelOverlay: vi.fn(),
    panelUsesSheet: false,
  }),
  studioMainAttrs: () => ({}),
}));

vi.mock('../../hooks/useAriaModel', () => ({
  useAriaModel: () => ({ modelId: null, selectModel: vi.fn() }),
}));
vi.mock('../../hooks/useJobCoverage', () => ({
  useJobCoverage: () => ({ coverage: null, keywords: [], ready: false }),
}));
vi.mock('../../hooks/useBodyScrollLock', () => ({ default: () => {} }));

vi.mock('../../services/cv.service', () => ({
  default: { studioSessions: vi.fn().mockResolvedValue({ sessions: [] }) },
}));

// The desk's furniture. None of it participates in choosing a session, and mounting the
// real chat would drag in the whole Studio. Each factory is written out in full because
// vi.mock is hoisted above every declaration in the file — a shared `stub` helper is not
// in scope by the time these run.
vi.mock('../../components/ariaStudio/StudioChat', () => ({
  default: () => <div data-testid="chat" />,
}));
vi.mock('../../components/ariaStudio/StudioArtifactPanel', () => ({
  default: () => <div data-testid="artifact" />,
}));
vi.mock('../../components/ariaStudio/JobTargetPanel', () => ({
  default: () => <div data-testid="job-target" />,
}));
vi.mock('../../components/ariaStudio/StudioLivePreview', () => ({
  default: () => <div data-testid="preview" />,
}));
vi.mock('../../components/ariaStudio/SessionRail', () => ({
  default: () => <div data-testid="rail" />,
}));
vi.mock('../../components/ariaStudio/DeleteSessionModal', () => ({
  default: () => <div data-testid="delete-modal" />,
}));
vi.mock('../../components/ariaStudio/StudioWelcomeGuide', () => ({
  default: () => <div data-testid="welcome" />,
}));
vi.mock('../../components/ariaStudio/EditModeUnlockedGuide', () => ({
  default: () => <div data-testid="edit-guide" />,
}));
vi.mock('../../components/ariaStudio/TargetJobStrip', () => ({
  default: () => <div data-testid="target-strip" />,
}));
vi.mock('../../components/ariaStudio/StudioOverlay', () => ({
  default: ({ children, open }) => (open ? <div>{children}</div> : null),
}));
vi.mock('../../components/ModelPicker', () => ({
  default: () => <div data-testid="model-picker" />,
}));

import '../../i18n';
import AriaStudio from './AriaStudio';

const mount = (state) => {
  routerState = state;
  return render(
    <MemoryRouter>
      <AriaStudio />
    </MemoryRouter>
  );
};

// loadSession is async in the real provider, so the draft arrives a render later. This
// is that second render — and the gap it models is the whole reason the preview cannot
// simply be opened at the door.
const bindDraft = (rendered, id) => {
  studio = { cvData: { _id: id, personalInfo: { fullName: 'Ada' } }, draftId: id };
  rendered.rerender(
    <MemoryRouter>
      <AriaStudio />
    </MemoryRouter>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  routerState = null;
  studio = { cvData: null, draftId: null };
  // The welcome guide reads this on mount; a clean slate keeps it out of the way.
  window.localStorage.setItem('ariaStudio:welcome-guide-seen:v1', '1');
});
afterEach(() => cleanup());

describe('Aria Studio — arriving with a draft named', () => {
  it('RESUMES the named draft rather than starting a new session', async () => {
    mount({ openDraft: 'draft-42' });
    await waitFor(() => expect(loadSession).toHaveBeenCalledWith('draft-42'));
    expect(newSession).not.toHaveBeenCalled();
    expect(openApplication).not.toHaveBeenCalled();
  });

  it('consumes the state once, so a refresh does not re-run it', async () => {
    const replace = vi.spyOn(window.history, 'replaceState');
    mount({ openDraft: 'draft-42' });
    await waitFor(() => expect(loadSession).toHaveBeenCalledTimes(1));
    expect(replace).toHaveBeenCalled();
    replace.mockRestore();
  });

  it('still starts a NEW session for the doors that name an intent, not a document', async () => {
    mount({ start: 'build' });
    await waitFor(() => expect(newSession).toHaveBeenCalledWith('build'));
    expect(loadSession).not.toHaveBeenCalled();
  });

  it('still reopens an analysis through openApplication', async () => {
    mount({ openApplication: 'app-7' });
    await waitFor(() => expect(openApplication).toHaveBeenCalledWith('app-7'));
    expect(loadSession).not.toHaveBeenCalled();
  });

  it('leaves the remembered session alone when nothing was named', async () => {
    // Plain /aria-studio must not be hijacked into a session by this branch.
    mount(null);
    await new Promise((r) => setTimeout(r, 0));
    expect(loadSession).not.toHaveBeenCalled();
    expect(newSession).not.toHaveBeenCalled();
  });
});

describe('Aria Studio — the preview on an Edit-with-Aria arrival', () => {
  it('opens the live preview once the draft has actually bound', async () => {
    // The point of the whole thing: someone who clicked Edit was looking at their CV a
    // second ago, and a chat with the document nowhere in sight reads as having lost it.
    const rendered = mount({ openDraft: 'draft-42' });
    await waitFor(() => expect(loadSession).toHaveBeenCalledWith('draft-42'));
    bindDraft(rendered, 'draft-42');
    await waitFor(() => expect(setPanelView).toHaveBeenCalledWith('preview'));
  });

  it('does NOT open it before the draft lands', async () => {
    // Opening at the door would be undone anyway — the panel closes itself while there
    // is no document to show — so firing early is not merely early, it is a no-op that
    // looks like it worked.
    mount({ openDraft: 'draft-42' });
    await waitFor(() => expect(loadSession).toHaveBeenCalled());
    expect(setPanelView).not.toHaveBeenCalledWith('preview');
  });

  it('opens it ONCE, then hands the panel back to the user', async () => {
    // It is a welcome, not a policy. Re-asserting it on later renders would make the
    // panel impossible to close.
    const rendered = mount({ openDraft: 'draft-42' });
    await waitFor(() => expect(loadSession).toHaveBeenCalledWith('draft-42'));
    bindDraft(rendered, 'draft-42');
    await waitFor(() => expect(setPanelView).toHaveBeenCalledWith('preview'));

    const opens = () => setPanelView.mock.calls.filter(([v]) => v === 'preview').length;
    const first = opens();
    bindDraft(rendered, 'draft-42');
    expect(opens()).toBe(first);
  });

  it('does not touch the panel for the doors that name an intent', async () => {
    // Starting a new CV lands on the roadmap with nothing to preview; forcing the panel
    // there would open an empty document beside a conversation that has not begun.
    const rendered = mount({ start: 'build' });
    await waitFor(() => expect(newSession).toHaveBeenCalled());
    bindDraft(rendered, 'draft-99');
    await new Promise((r) => setTimeout(r, 0));
    expect(setPanelView).not.toHaveBeenCalledWith('preview');
  });
});
