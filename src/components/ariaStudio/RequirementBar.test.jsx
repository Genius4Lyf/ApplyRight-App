// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

// It now opens on arrival (see "one look at what this job asks for"), so this only has
// to act when something has since closed it.
const openBar = () => {
  const collapsed = screen.queryByRole('button', { expanded: false });
  if (collapsed) fireEvent.click(collapsed);
};

const header = () => screen.getByText(i18n.t('ariaStudio.jobTarget.eyebrow')).closest('button');

afterEach(cleanup);

describe('RequirementBar', () => {
  it('renders nothing when this CV has no job to aim at', () => {
    const { container } = render(<RequirementBar rows={[]} />);
    expect(container.firstChild).toBeNull();
  });

  // A collapsed strip above the keyboard is easy to never notice, and someone who never
  // opens it never learns the interview has a spine. It shows itself once, on arrival.
  it('opens on arrival, so the list is seen at least once', () => {
    setup();
    expect(screen.getByRole('button', { expanded: true })).toBeTruthy();
    expect(screen.getByText('Troubleshooting')).toBeTruthy();
  });

  it('closes on a tap and stays closed — from then on the user decides', async () => {
    setup();
    fireEvent.click(header());
    await waitFor(() => expect(screen.queryByText('Troubleshooting')).toBeNull());
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

// The count and the target panel measure the SAME job on the same screen. Counting
// nice-to-haves here made the bar say "0 of 6" while the panel said "0 of 5".
describe('RequirementBar — what the count counts', () => {
  const MIXED = [
    ROW({ name: 'Permit-to-Work', requirementId: 'req_ptw' }),
    ROW({
      name: 'HSSE',
      requirementId: 'req_hsse',
      covered: true,
      state: REQUIREMENT_STATE.COVERED,
    }),
    ROW({ name: 'Upstream production', requirementId: 'req_up', importance: 'nice_to_have' }),
  ];

  it('counts must-haves only — a bonus you have not covered is not a gap', () => {
    render(<RequirementBar rows={MIXED} />);
    expect(
      screen.getByText(i18n.t('ariaStudio.sectionCoach.checklist.count', { done: 1, total: 2 }))
    ).toBeTruthy();
  });

  it('still lists the nice-to-have — it is worth having, just not counted', () => {
    render(<RequirementBar rows={MIXED} />);
    openBar();
    expect(screen.getByText('Upstream production')).toBeTruthy();
  });

  it('falls back to counting everything when the posting states no must-have', () => {
    render(<RequirementBar rows={[ROW({ name: 'Nice thing', importance: 'nice_to_have' })]} />);
    expect(
      screen.getByText(i18n.t('ariaStudio.sectionCoach.checklist.count', { done: 0, total: 1 }))
    ).toBeTruthy();
  });
});

describe('RequirementBar — asking twice for the same thing', () => {
  it('spends the tap, so the same requirement cannot be re-asked', () => {
    const onAsk = vi.fn();
    setup({ onAsk, askedId: 'req_ts' });
    openBar();
    const spent = screen.getByText(i18n.t('ariaStudio.sectionCoach.checklist.asked'));
    fireEvent.click(spent);
    expect(onAsk).not.toHaveBeenCalled();
    expect(spent.closest('button').disabled).toBe(true);
  });

  it('leaves the row in place rather than reshuffling under the finger', () => {
    setup({ askedId: 'req_ts' });
    openBar();
    expect(screen.getByText('Troubleshooting')).toBeTruthy();
  });
});

// The pinned entry card hangs over the top of the conversation and this rises from the
// bottom. Opened together on a phone they meet in the middle and bury the question.
describe('RequirementBar — one floating panel at a time', () => {
  it('announces a user-opened list, so whatever else is open can stand down', () => {
    const onOpen = vi.fn();
    setup({ onOpen });
    // Arriving open is not a user action and announces nothing — nothing else is open yet
    // to be closed by it, and closing the pinned card behind someone's back would be rude.
    expect(onOpen).not.toHaveBeenCalled();

    fireEvent.click(header()); // closed
    fireEvent.click(header()); // opened, by hand
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('does not announce on close', () => {
    const onOpen = vi.fn();
    setup({ onOpen });
    fireEvent.click(header()); // close
    fireEvent.click(header()); // open  → 1
    fireEvent.click(header()); // close → still 1
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('closes when the parent signals, and only ever closes', async () => {
    const { rerender } = render(<RequirementBar rows={ROWS} collapseSignal={0} />);
    openBar();
    expect(screen.getByText('Troubleshooting')).toBeTruthy();

    // The list animates out, so it lingers a frame after the signal lands.
    rerender(<RequirementBar rows={ROWS} collapseSignal={1} />);
    await waitFor(() => expect(screen.queryByText('Troubleshooting')).toBeNull());

    // A further signal cannot re-open it — that is what stops two panels fighting.
    rerender(<RequirementBar rows={ROWS} collapseSignal={2} />);
    await waitFor(() => expect(screen.queryByText('Troubleshooting')).toBeNull());
  });
});
