// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '../../i18n';
import PinnedEntryCard from './PinnedEntryCard';

// Correcting a captured field mid-interview.
//
// The bug these cover: the interview asks one question at a time, and a mistyped answer —
// the company typed into the role title — had no way back. The capture card has no "back",
// this card was read-only, and the Live Preview stays locked until the CV is finished.
//
// What matters most here is the PATCH SHAPE. onFieldSave is wired straight to
// applyEntryEdit, which is a narrow field overwrite: whatever keys arrive get written to
// the entry and saved as { _id, <list> }. A card that sent the whole entry back would turn
// every correction into a full-document overwrite and could resurrect stale bullets, so the
// assertions below check the exact object, not just that the spy fired.

const experienceEntry = {
  _sortId: 'exp-1',
  entryType: 'employment',
  title: 'Baker Hughes',
  company: 'Baker Hughes',
  startDate: 'Mar 2021',
  endDate: 'Aug 2024',
  isCurrent: false,
  description: '• Cut rig downtime by 18%',
};

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

afterEach(cleanup);

describe('PinnedEntryCard inline field editing', () => {
  it('offers a quiet edit control on a captured field', () => {
    render(
      <PinnedEntryCard
        entry={experienceEntry}
        section="experience"
        onFieldSave={vi.fn()}
        defaultExpanded
      />
    );

    expect(screen.getByRole('button', { name: 'Edit Role' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit Company' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit Dates' })).toBeTruthy();
  });

  it('seeds the editor with the value already captured', () => {
    render(
      <PinnedEntryCard
        entry={experienceEntry}
        section="experience"
        defaultExpanded
        onFieldSave={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit Role' }));

    // Seeded from the entry — the point of the ✎ is to correct what is actually saved,
    // so an empty box would make the user retype a value they can already see.
    expect(screen.getByRole('textbox', { name: 'Edit Role' }).value).toBe('Baker Hughes');
  });

  it('saves ONLY the field that changed', async () => {
    const onFieldSave = vi.fn().mockResolvedValue({ ok: true });
    render(
      <PinnedEntryCard
        entry={experienceEntry}
        section="experience"
        defaultExpanded
        onFieldSave={onFieldSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit Role' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Edit Role' }), {
      target: { value: '  Field Engineer  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    // Exactly one key, trimmed. Nothing about the company, the dates or the bullets rides
    // along, so the save can't overwrite anything the user didn't touch.
    await waitFor(() => expect(onFieldSave).toHaveBeenCalledTimes(1));
    expect(onFieldSave).toHaveBeenCalledWith({ title: 'Field Engineer' });

    // Resolved ok → the editor closes and the row goes back to being a value.
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Edit Role' })).toBeNull());
  });

  it('sends the three date keys together so a current role keeps no stale end date', async () => {
    const onFieldSave = vi.fn().mockResolvedValue({ ok: true });
    render(
      <PinnedEntryCard
        entry={experienceEntry}
        section="experience"
        defaultExpanded
        onFieldSave={onFieldSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit Dates' }));
    expect(screen.getByRole('textbox', { name: 'Started' }).value).toBe('Mar 2021');
    expect(screen.getByRole('textbox', { name: 'Ended' }).value).toBe('Aug 2024');

    fireEvent.click(screen.getByRole('checkbox', { name: 'I still work here' }));
    // "Still here" and an end date can't both be true; the end input goes away with it.
    expect(screen.queryByRole('textbox', { name: 'Ended' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onFieldSave).toHaveBeenCalledTimes(1));
    expect(onFieldSave).toHaveBeenCalledWith({
      startDate: 'Mar 2021',
      endDate: '',
      isCurrent: true,
    });
  });

  it('writes nothing on Cancel or Escape', () => {
    const onFieldSave = vi.fn().mockResolvedValue({ ok: true });
    render(
      <PinnedEntryCard
        entry={experienceEntry}
        section="experience"
        defaultExpanded
        onFieldSave={onFieldSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit Company' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Edit Company' }), {
      target: { value: 'Typed but abandoned' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('textbox', { name: 'Edit Company' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Company' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Edit Company' }), {
      target: { value: 'Also abandoned' },
    });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Edit Company' }), { key: 'Escape' });
    expect(screen.queryByRole('textbox', { name: 'Edit Company' })).toBeNull();

    // Abandoning an edit is not a save: no patch, so nothing to roll back either.
    expect(onFieldSave).not.toHaveBeenCalled();
  });

  it('leaves the chip-picked type and the bullet list alone', () => {
    render(
      <PinnedEntryCard
        entry={experienceEntry}
        section="experience"
        defaultExpanded
        onFieldSave={vi.fn()}
      />
    );

    // entryType drives what Aria asks next, and achievements are a generated LIST applied
    // through the bullet diff. Neither belongs behind a single-line text box.
    expect(screen.queryByRole('button', { name: 'Edit Experience type' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit Achievements' })).toBeNull();
  });

  it('shows no edit control at all when the parent gave nowhere to write', () => {
    render(<PinnedEntryCard entry={experienceEntry} section="experience" />);

    expect(screen.queryByRole('button', { name: 'Edit Role' })).toBeNull();
  });
});

const educationEntry = {
  _sortId: 'edu-1',
  degree: 'BSc Computer Science',
  school: 'University of Lagos',
  graduationDate: '2019',
  cgpa: '4.5/5.0',
};

describe('PinnedEntryCard — education CGPA', () => {
  it('offers an edit control once a CGPA is captured', () => {
    render(
      <PinnedEntryCard
        entry={educationEntry}
        section="education"
        onFieldSave={vi.fn()}
        defaultExpanded
      />
    );

    expect(screen.getByRole('button', { name: 'Edit CGPA / Grade' })).toBeTruthy();
  });

  it('saves an edited CGPA value', async () => {
    const onFieldSave = vi.fn().mockResolvedValue({ ok: true });
    render(
      <PinnedEntryCard
        entry={educationEntry}
        section="education"
        defaultExpanded
        onFieldSave={onFieldSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit CGPA / Grade' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Edit CGPA / Grade' }), {
      target: { value: '4.8/5.0' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onFieldSave).toHaveBeenCalledTimes(1));
    expect(onFieldSave).toHaveBeenCalledWith({ cgpa: '4.8/5.0' });
  });

  it('accepts an EMPTY CGPA on save — it is optional, unlike degree/school', async () => {
    const onFieldSave = vi.fn().mockResolvedValue({ ok: true });
    render(
      <PinnedEntryCard
        entry={educationEntry}
        section="education"
        defaultExpanded
        onFieldSave={onFieldSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit CGPA / Grade' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Edit CGPA / Grade' }), {
      target: { value: '' },
    });
    expect(screen.getByRole('button', { name: 'Save' }).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onFieldSave).toHaveBeenCalledTimes(1));
    expect(onFieldSave).toHaveBeenCalledWith({ cgpa: '' });
  });
});

describe('the "something landed here" pulse', () => {
  // messagePulse fires whenever work lands on the pinned entry — bullets applied, or a
  // qualification saved. It used to decorate the BULLET COUNT chip only, which is gated
  // on there being bullets. Education never has any, so in the one section where the
  // conversation ends at the form the nudge had nothing to land on and did nothing.
  const qualification = {
    _sortId: 'ed-1',
    degree: 'BSc Electrical Engineering',
    school: 'UNIBEN',
    graduationDate: '2021',
  };

  const renderPinned = (entry, section, messagePulse) =>
    render(
      <PinnedEntryCard
        entry={entry}
        section={section}
        messagePulse={messagePulse}
        onNextRole={vi.fn()}
        onDone={vi.fn()}
      />
    );

  // Filtered in JS, not by selector: the Tailwind arbitrary-value class contains
  // brackets and dots, and jsdom rejects them inside an attribute-value selector.
  const pulsing = (container) =>
    [...container.querySelectorAll('*')].filter((node) =>
      String(node.className || '').includes('animate-[bounce')
    );

  it('pulses the counter for a section with no bullets', () => {
    const { container } = renderPinned(qualification, 'education', 1);
    expect(pulsing(container).length).toBe(1);
  });

  it('stays still when nothing has just landed', () => {
    const { container } = renderPinned(qualification, 'education', 0);
    expect(pulsing(container).length).toBe(0);
  });

  it('still pulses the bullet count when there are bullets', () => {
    // The original behaviour, unchanged — and only ONE thing pulses, so a role does not
    // flash in two places at once.
    const { container } = renderPinned(experienceEntry, 'experience', 1);
    expect(pulsing(container).length).toBe(1);
    expect(container.textContent).toContain('1');
  });
});

describe('the collapsed card is inert', () => {
  it('hides its actions from keyboard and screen readers while closed', () => {
    // opacity-0 hid the panel from sight but not from the browser: its buttons stayed
    // focusable and announced. Once the same two actions were also offered in the chat,
    // a screen reader read each of them twice.
    const { container } = render(
      <PinnedEntryCard
        entry={{ _sortId: 'ed-1', degree: 'BSc', school: 'UNIBEN', graduationDate: '2021' }}
        section="education"
        onNextRole={vi.fn()}
        onDone={vi.fn()}
      />
    );

    const panel = container.querySelector('[aria-hidden="true"][inert]');
    expect(panel).toBeTruthy();
    expect(panel.textContent).toContain(i18n.t('ariaStudio.pinnedEntry.copy.education.done'));
  });
});

// THE WAY OUT OF A ROLE HAS TO BE ON SCREEN.
//
// "Next role" and "Done with work history" are the only two exits from an interview.
// They sat below an achievements list capped in `vh` — a unit that cannot see the
// requirement bar and composer docked beneath the conversation — so on a laptop at 100%
// both fell behind the dock, with nothing on screen saying where they had gone. Reported
// from use: "it might make them not able to figure it out".
//
// jsdom loads no CSS, so these pin the MECHANISM rather than measured pixels: one bounded
// scroller sized to the chat area, the decisions stuck to the foot of it, and the bullets
// no longer a scroller of their own. That cannot prove the buttons are visible; it can
// prove nobody quietly removed what makes them so.
describe('the decisions cannot be scrolled out of reach', () => {
  const longRole = {
    ...experienceEntry,
    description: Array.from({ length: 40 }, (_, i) => `• bullet number ${i}`).join('\n'),
  };

  const openPanel = () => {
    const { container } = render(
      <PinnedEntryCard
        entry={longRole}
        section="experience"
        defaultExpanded
        onNextRole={vi.fn()}
        onDone={vi.fn()}
      />
    );
    return container;
  };

  const bodyOf = (container) => container.querySelector('[role="group"][tabindex="0"]');

  it('bounds the panel body against the chat area, not the window', () => {
    const body = bodyOf(openPanel());
    expect(body).toBeTruthy();
    expect(body.className).toContain('overflow-y-auto');
    // The variable StudioChat publishes from the scroller's real height. A `vh` bound
    // here is precisely the bug.
    expect(body.className).toContain('--studio-chat-h');
  });

  it('pins the two exits to the foot of that body', () => {
    const container = openPanel();
    const row = screen
      .getByText(i18n.t('ariaStudio.pinnedEntry.copy.experience.next'))
      .closest('div');
    expect(row.className).toContain('sticky');
    expect(row.className).toContain('bottom-0');
    expect(row.textContent).toContain(i18n.t('ariaStudio.pinnedEntry.copy.experience.done'));
    // Inside the scroller, or there is nothing for sticky to stick within.
    expect(bodyOf(container).contains(row)).toBe(true);
  });

  // A PANEL THAT DISAPPEARS IS A PANEL THAT CLOSED.
  //
  // "Next role" re-keys this card to the new entry and "Done with work history" removes
  // it altogether — so in both cases the card that was OPEN simply vanishes. Reporting
  // only on `open` meant it never said so on the way out, and StudioChat was left holding
  // pinOpen=true: the backdrop stayed blurred over a conversation with nothing floating
  // above it. Reported from use, on exactly those two buttons.
  it('reports itself closed when it is unmounted while open', () => {
    const onOpenChange = vi.fn();
    const { unmount } = render(
      <PinnedEntryCard
        entry={experienceEntry}
        section="experience"
        defaultExpanded
        onOpenChange={onOpenChange}
        onNextRole={vi.fn()}
        onDone={vi.fn()}
      />
    );
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    unmount();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('leaves the achievements list in plain flow — one scroller, not two nested', () => {
    const list = openPanel().querySelector(
      `[role="group"][aria-label="${i18n.t('ariaStudio.pinnedEntry.achievementsList')}"]`
    );
    expect(list).toBeTruthy();
    expect(list.className).not.toContain('overflow-y-auto');
  });
});
