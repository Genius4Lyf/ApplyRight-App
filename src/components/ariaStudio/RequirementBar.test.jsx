// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18n from '../../i18n';
import RequirementBar from './RequirementBar';
import { REQUIREMENT_STATE } from '../../lib/requirementRows';

// What this job asks for, while you are being interviewed about it. The job description
// used to be read once, shown once, and then vanish into a prompt — TargetJobStrip even
// hides itself during a role interview, so at the exact moment someone was being
// interviewed FOR a job there was nothing about that job on screen.

const ROW = (over = {}) => ({
  name: 'Permit-to-Work',
  importance: 'must_have',
  covered: false,
  declined: false,
  qualification: false,
  state: REQUIREMENT_STATE.OPEN,
  requirementId: 'req_ptw',
  provenAt: '',
  ...over,
});

const ROWS = [
  ROW({ name: 'Troubleshooting', requirementId: 'req_ts' }),
  ROW({
    name: 'HSSE',
    requirementId: 'req_hsse',
    covered: true,
    state: REQUIREMENT_STATE.COVERED,
    provenAt: 'Technician · Dangote',
  }),
  ROW({
    name: 'Root-cause analysis',
    requirementId: 'req_rca',
    declined: true,
    state: REQUIREMENT_STATE.DECLINED,
  }),
];

const setup = (props = {}) => render(<RequirementBar rows={ROWS} {...props} />);

const openBar = () => fireEvent.click(screen.getByRole('button', { expanded: false }));

afterEach(cleanup);

describe('RequirementBar', () => {
  it('renders nothing when this CV has no job to aim at', () => {
    const { container } = render(<RequirementBar rows={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('is collapsed by default — ignoring it stays a complete way to work', () => {
    setup();
    expect(screen.getByRole('button', { expanded: false })).toBeTruthy();
    expect(screen.queryByText('Troubleshooting')).toBeNull();
  });

  it('counts only what it shows, and says so on one line', () => {
    setup();
    expect(
      screen.getByText(i18n.t('ariaStudio.sectionCoach.checklist.count', { done: 1, total: 3 }))
    ).toBeTruthy();
  });

  it('opens to the three states', () => {
    setup();
    openBar();
    expect(screen.getByText('Troubleshooting')).toBeTruthy();
    expect(screen.getByText('HSSE')).toBeTruthy();
    expect(screen.getByText(i18n.t('ariaStudio.sectionCoach.checklist.declined'))).toBeTruthy();
  });

  it('says WHY a requirement ticked — a tick with no reason is just a claim', () => {
    setup();
    openBar();
    expect(
      screen.getByText(i18n.t('ariaStudio.jobTarget.provedAt', { where: 'Technician · Dangote' }))
    ).toBeTruthy();
  });

  it('offers to ask about an open requirement, and hands back the row', () => {
    const onAsk = vi.fn();
    setup({ onAsk });
    openBar();
    fireEvent.click(screen.getByText(i18n.t('ariaStudio.sectionCoach.checklist.askMe')));
    expect(onAsk).toHaveBeenCalledWith(expect.objectContaining({ requirementId: 'req_ts' }));
  });

  it('never offers to ask about something already covered or already refused', () => {
    setup({ onAsk: vi.fn() });
    openBar();
    // Only the one OPEN row may be asked about.
    expect(screen.getAllByText(i18n.t('ariaStudio.sectionCoach.checklist.askMe'))).toHaveLength(1);
  });

  it('lets a "no" be taken back — once it is visible, a mis-tap must not be permanent', () => {
    const onUndo = vi.fn();
    setup({ onUndo });
    openBar();
    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('ariaStudio.sectionCoach.checklist.undo') })
    );
    expect(onUndo).toHaveBeenCalledWith(expect.objectContaining({ name: 'Root-cause analysis' }));
  });

  it('shows a pending row as next up instead of offering the tap again', () => {
    setup({ pendingId: 'req_ts' });
    openBar();
    expect(screen.getByText(i18n.t('ariaStudio.sectionCoach.checklist.nextUp'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('ariaStudio.sectionCoach.checklist.askMe'))).toBeNull();
  });

  it('hides the tap entirely when asking is not possible right now', () => {
    // Mid-connection on a call, or a turn already in flight in chat.
    setup({ canAsk: false });
    openBar();
    expect(screen.queryByText(i18n.t('ariaStudio.sectionCoach.checklist.askMe'))).toBeNull();
    // The list itself stays readable — only the action goes.
    expect(screen.getByText('Troubleshooting')).toBeTruthy();
  });

  it('uses the call wording when the tap steers a live call', () => {
    setup({ onCall: true });
    openBar();
    expect(screen.getByText(i18n.t('ariaStudio.sectionCoach.checklist.askOnCall'))).toBeTruthy();
  });

  // A qualification is something you HOLD. Offering it would invite "did you do Mechanical
  // Engineering at this job?", which is not answerable by talking.
  it('never shows a qualification, and does not count it', () => {
    render(
      <RequirementBar
        rows={[...ROWS, ROW({ name: 'Mechanical Engineering', qualification: true })]}
      />
    );
    expect(
      screen.getByText(i18n.t('ariaStudio.sectionCoach.checklist.count', { done: 1, total: 3 }))
    ).toBeTruthy();
    openBar();
    expect(screen.queryByText('Mechanical Engineering')).toBeNull();
  });

  it('renders nothing when every requirement is a qualification', () => {
    const { container } = render(
      <RequirementBar rows={[ROW({ name: 'Mechanical Engineering', qualification: true })]} />
    );
    expect(container.firstChild).toBeNull();
  });
});
