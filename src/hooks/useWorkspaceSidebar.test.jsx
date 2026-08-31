// @vitest-environment jsdom
//
// The sidebar's whole promise is that it shows you what belongs to the surface you are on
// and keeps you there. That is one property with three settings, and getting any of them
// wrong is invisible until someone is looking at the wrong list or has been thrown out of
// the page they were working in — so it is pinned here rather than left to a manual pass.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react';

import '../i18n';

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));
vi.mock('sonner', () => {
  const toast = vi.fn();
  toast.error = vi.fn();
  toast.success = vi.fn();
  return { toast };
});
vi.mock('../services/cv.service', () => ({
  default: { listCvs: vi.fn().mockResolvedValue([]), deleteDraft: vi.fn().mockResolvedValue({}) },
}));
vi.mock('../services/interviewPrep.service', () => ({
  default: { list: vi.fn().mockResolvedValue({ items: [] }) },
}));

// The nav + profile blocks fetch a wallet and read the router; neither is what this is
// about.
vi.mock('../components/ariaStudio/StudioSidebarNav', () => ({ default: () => null }));
vi.mock('../components/ariaStudio/StudioSidebarProfile', () => ({ default: () => null }));

import CVService from '../services/cv.service';
import InterviewPrepService from '../services/interviewPrep.service';
import { useWorkspaceSidebar } from './useWorkspaceSidebar';

const COMPLETE_CV = {
  _id: 'cv-done',
  title: 'Offshore Electrician',
  personalInfo: { fullName: 'Ernest A' },
  professionalSummary: 'Ten years offshore.',
  experience: [{ _id: 'e1' }],
  education: [{ _id: 'ed1' }],
  skills: [{ _id: 's1' }],
};

const PARTIAL_CV = {
  _id: 'cv-wip',
  title: 'Graduate CV',
  personalInfo: { fullName: 'Ernest A' },
  experience: [],
  education: [],
  skills: [],
};

const PREPPED_APPLICATION = {
  _id: 'app-1',
  jobId: { title: 'Rig Electrician', company: 'Seadrill' },
  interviewPrep: { savedAt: '2026-08-20' },
};

const Host = ({ scope, activeId }) => {
  const { openSidebar, sidebar } = useWorkspaceSidebar({ scope, activeId });
  return (
    <>
      <button type="button" onClick={openSidebar}>
        open
      </button>
      {sidebar}
    </>
  );
};

const mount = (scope, activeId) => render(<Host scope={scope} activeId={activeId} />);
const open = () => fireEvent.click(screen.getByRole('button', { name: 'open' }));

beforeEach(() => {
  vi.clearAllMocks();
  CVService.listCvs.mockResolvedValue([COMPLETE_CV, PARTIAL_CV]);
  InterviewPrepService.list.mockResolvedValue({ items: [PREPPED_APPLICATION] });
});

afterEach(() => cleanup());

describe('useWorkspaceSidebar — which list a surface gets', () => {
  it('fetches nothing until it is opened', () => {
    // It is optional chrome on a page someone came to for something else. Most visits
    // never open it, and none of them should pay for a list nobody asked to see.
    mount('builder');
    expect(CVService.listCvs).not.toHaveBeenCalled();
  });

  it('asks for the builder scope in the wizard and every CV in the studio', async () => {
    mount('builder');
    open();
    await waitFor(() => expect(CVService.listCvs).toHaveBeenCalledWith('builder'));

    cleanup();
    vi.clearAllMocks();
    CVService.listCvs.mockResolvedValue([COMPLETE_CV]);

    mount('cvStudio');
    open();
    await waitFor(() => expect(CVService.listCvs).toHaveBeenCalledWith('all'));
  });

  it('asks the prep endpoint on a prep dashboard, not the CV one', async () => {
    mount('prep');
    open();
    await waitFor(() => expect(InterviewPrepService.list).toHaveBeenCalled());
    expect(CVService.listCvs).not.toHaveBeenCalled();
    expect(await screen.findByText('Rig Electrician')).toBeTruthy();
  });
});

describe('useWorkspaceSidebar — a row keeps you where you are', () => {
  it('resumes in the wizard from the builder', async () => {
    mount('builder');
    open();
    fireEvent.click(await screen.findByText('Graduate CV'));
    expect(navigate).toHaveBeenCalledWith('/cv-builder/cv-wip');
  });

  it('opens the document from the studio — even one that is unfinished', async () => {
    // The old rule sent an incomplete CV to the wizard. Here the surface wins: you asked
    // for this list from the studio, so the row answers in the studio.
    mount('cvStudio');
    open();
    fireEvent.click(await screen.findByText('Graduate CV'));
    expect(navigate).toHaveBeenCalledWith('/resume/cv-wip');
  });

  it('opens the prep dashboard from a prep dashboard', async () => {
    mount('prep');
    open();
    fireEvent.click(await screen.findByText('Rig Electrician'));
    expect(navigate).toHaveBeenCalledWith('/interview-prep/app-1');
  });
});

describe('useWorkspaceSidebar — what each scope offers', () => {
  it('filters CVs by whether they are finished', async () => {
    mount('builder');
    open();
    await screen.findByText('Graduate CV');

    fireEvent.click(screen.getByRole('button', { name: /filter this list/i }));
    fireEvent.click(screen.getByRole('option', { name: 'Complete' }));

    expect(screen.getByText('Offshore Electrician')).toBeTruthy();
    expect(screen.queryByText('Graduate CV')).toBeNull();
  });

  it('offers no filter and no delete on a prep list', async () => {
    // An application is not a document you own in the same way — there is nothing here to
    // slice by, and deleting one would take an analysis with it.
    mount('prep');
    open();
    await screen.findByText('Rig Electrician');

    expect(screen.queryByRole('button', { name: /filter this list/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
  });

  it('asks before deleting a CV, and only then calls the endpoint', async () => {
    mount('builder');
    open();
    await screen.findByText('Graduate CV');

    fireEvent.click(screen.getByRole('button', { name: /delete graduate cv/i }));
    expect(CVService.deleteDraft).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(CVService.deleteDraft).toHaveBeenCalledWith('cv-wip'));
    // Gone from the list without a refetch — the row is the only thing that changed.
    await waitFor(() => expect(screen.queryByText('Graduate CV')).toBeNull());
  });
});

// ── Persistent mode ──
//
// One surface (the interview prep dashboard) carries this list as a COLUMN of the page
// rather than a drawer over it. That flips two things that the drawer's whole design
// depended on — the list is now always on screen, and "open" stops being a moment — so
// the properties that survive the flip are pinned here.

const PersistentHost = ({ scope = 'prep', activeId, persistent = true }) => {
  const { sidebar, inlineSidebar, openSidebar } = useWorkspaceSidebar({
    scope,
    activeId,
    persistent,
  });
  return (
    <>
      {/* The host's own control. There is no collapse — where the panel fits it stays —
          so this only ever opens the drawer, and the page renders it only at the widths
          where a drawer is what you get. */}
      <button type="button" onClick={openSidebar}>
        open
      </button>
      {inlineSidebar}
      {sidebar}
    </>
  );
};

// Wide enough for the panel to have an inline home. Kept local so the suites above,
// which never stub matchMedia, keep exercising the guard in useWorkspaceLayout.
const stubWide = (matches = true) =>
  vi.stubGlobal('matchMedia', (media) => ({
    media,
    matches,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

describe('useWorkspaceSidebar — carried as a column', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('fetches on MOUNT, because a panel that is always visible is never unasked-for', async () => {
    stubWide();
    render(<PersistentHost activeId="app-1" />);
    // No click. The list is on screen, so it has to have something in it.
    await waitFor(() => expect(InterviewPrepService.list).toHaveBeenCalled());
    expect(await screen.findByText('Rig Electrician')).toBeTruthy();
  });

  it('refreshes when you switch rows from it', async () => {
    // The page stays MOUNTED across /interview-prep/:id changes, so without this the list
    // would freeze at whatever it held on first load — the active marker sliding over
    // stale rows and stale readiness scores.
    stubWide();
    const view = render(<PersistentHost activeId="app-1" />);
    await waitFor(() => expect(InterviewPrepService.list).toHaveBeenCalledTimes(1));

    view.rerender(<PersistentHost activeId="app-2" />);
    await waitFor(() => expect(InterviewPrepService.list).toHaveBeenCalledTimes(2));
  });

  it('has no control to close it, because it is part of the page', async () => {
    // The column is furniture, not an overlay: no dismiss, no collapse, nothing to put
    // back. A control to fold it away would be asking for a decision nobody wants to make
    // twice, in exchange for 248px on a screen that plainly had room.
    stubWide();
    render(<PersistentHost activeId="app-1" />);
    await screen.findByText('Rig Electrician');

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('button', { name: /close|hide/i })).toBeNull();
  });

  it('writes no preference for a panel that cannot be collapsed', async () => {
    stubWide();
    render(<PersistentHost activeId="app-1" />);
    await screen.findByText('Rig Electrician');
    expect(localStorage.length).toBe(0);
  });

  it('leaves a drawer-only surface fetching nothing and remembering nothing', async () => {
    // The guard on the three surfaces that did not opt in: same code path, same width,
    // and still no fetch on mount and no stored preference.
    stubWide();
    render(<PersistentHost scope="builder" persistent={false} />);
    expect(CVService.listCvs).not.toHaveBeenCalled();
    expect(localStorage.getItem('workspace:builder:railOpen')).toBeNull();
  });
});
