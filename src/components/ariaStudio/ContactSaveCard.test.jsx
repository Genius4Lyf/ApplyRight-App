// @vitest-environment jsdom
//
// Aria's offer to remember a contact detail. This card writes personal data to the account
// that seeds every future CV, so the things worth pinning are all about consent:
//
//   it shows the VALUE, not just the field name — nobody should agree to save something
//     they cannot see;
//   unticking a row really declines it, rather than merely hiding it from the list;
//   and the two ways out mean different things. "Not now" is this CV only; "Don't ask
//     again" is a persisted decision. Collapsing them into one control would either nag a
//     user who has said no, or permanently silence one who meant "later".
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import i18n from '../../i18n';
import ContactSaveCard from './ContactSaveCard';

afterEach(cleanup);

const t = (key, opts) => i18n.t(key, opts);

const ROWS = [
  { key: 'phone', cv: 'phone', profile: 'phone', value: '0803 123 4567' },
  { key: 'location', cv: 'address', profile: 'location', value: 'Lagos, Nigeria' },
];

const mount = (props = {}) =>
  render(
    <ContactSaveCard
      rows={ROWS}
      onSave={vi.fn()}
      onDismiss={vi.fn()}
      onNeverAsk={vi.fn()}
      {...props}
    />
  );

const saveBtn = () => screen.getByRole('button', { name: t('ariaStudio.contactSave.save') });

describe('ContactSaveCard — what it asks', () => {
  it('shows each value, not just the field it belongs to', () => {
    mount();

    expect(screen.getByText('0803 123 4567')).toBeTruthy();
    expect(screen.getByText('Lagos, Nigeria')).toBeTruthy();
    expect(screen.getByText(t('ariaStudio.contactSave.fields.phone'))).toBeTruthy();
    expect(screen.getByText(t('ariaStudio.contactSave.fields.location'))).toBeTruthy();
  });

  it('renders nothing at all when there is nothing to offer', () => {
    const { container } = mount({ rows: [] });
    expect(container.textContent).toBe('');
  });

  it('starts with everything ticked — these are details just typed on purpose', () => {
    mount();
    screen.getAllByRole('checkbox').forEach((box) => expect(box.checked).toBe(true));
  });
});

describe('ContactSaveCard — consent per field', () => {
  it('saves only the rows left ticked', () => {
    const onSave = vi.fn();
    mount({ onSave });

    // "Save my number but not where I live" is an ordinary thing to want.
    const boxes = screen.getAllByRole('checkbox');
    fireEvent.click(boxes[1]);
    fireEvent.click(saveBtn());

    expect(onSave).toHaveBeenCalledWith(['phone']);
  });

  it('cannot save nothing', () => {
    const onSave = vi.fn();
    mount({ onSave });

    screen.getAllByRole('checkbox').forEach((box) => fireEvent.click(box));
    expect(saveBtn().disabled).toBe(true);

    fireEvent.click(saveBtn());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('locks the controls while the save is in flight', () => {
    mount({ saving: true });

    expect(screen.getByRole('button', { name: t('ariaStudio.contactSave.saving') }).disabled).toBe(
      true
    );
    screen.getAllByRole('checkbox').forEach((box) => expect(box.disabled).toBe(true));
  });
});

describe('ContactSaveCard — the two ways out', () => {
  it('offers BOTH "not now" and "don\'t ask again"', () => {
    mount();

    expect(screen.getByRole('button', { name: t('ariaStudio.contactSave.notNow') })).toBeTruthy();
    expect(screen.getByRole('button', { name: t('ariaStudio.contactSave.neverAsk') })).toBeTruthy();
  });

  it('keeps them on separate handlers, because they mean different things', () => {
    const onDismiss = vi.fn();
    const onNeverAsk = vi.fn();
    mount({ onDismiss, onNeverAsk });

    fireEvent.click(screen.getByRole('button', { name: t('ariaStudio.contactSave.notNow') }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onNeverAsk).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: t('ariaStudio.contactSave.neverAsk') }));
    expect(onNeverAsk).toHaveBeenCalledTimes(1);
    // Declining permanently is not also a save.
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
