// @vitest-environment jsdom
//
// Edit, in the CV Studio, is a choice of PLACE — and getting it wrong is not cosmetic.
// Sending an Aria CV into the builder abandons the transcript it was written in; sending a
// builder CV to Aria hands her a document with no conversation to resume. So what these
// tests hold is the one thing that must never slip: the disabled row cannot fire.
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react';

import '../../i18n';
import EditOriginMenu from './EditOriginMenu';

const mount = (props = {}) => {
  const onEditWithAria = vi.fn();
  const onEditInBuilder = vi.fn();
  render(
    <EditOriginMenu
      origin="builder"
      onEditWithAria={onEditWithAria}
      onEditInBuilder={onEditInBuilder}
      {...props}
    />
  );
  return { onEditWithAria, onEditInBuilder };
};

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: /where to edit/i }));
const ariaRow = () => screen.getByRole('menuitem', { name: /edit with aria/i });
const builderRow = () => screen.getByRole('menuitem', { name: /edit in the cv builder/i });

afterEach(() => cleanup());

describe('EditOriginMenu', () => {
  it('keeps both destinations behind the trigger until it is opened', () => {
    mount();
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
    openMenu();
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
  });

  it('SHOWS the surface that does not apply rather than hiding it', () => {
    // The locked row is the point of the menu. Hiding it would leave a single button that
    // silently picks a side, and someone who built this CV in the builder would never
    // learn that editing it with Aria is a thing that exists at all.
    mount({ origin: 'builder' });
    openMenu();
    expect(ariaRow()).toBeTruthy();
    expect(ariaRow().disabled).toBe(true);
    expect(builderRow().disabled).toBe(false);
  });

  it('enables Aria — and only Aria — for a CV she wrote', () => {
    mount({ origin: 'aria' });
    openMenu();
    expect(ariaRow().disabled).toBe(false);
    expect(builderRow().disabled).toBe(true);
  });

  it('opens the builder for a builder CV', () => {
    const { onEditInBuilder, onEditWithAria } = mount({ origin: 'builder' });
    openMenu();
    fireEvent.click(builderRow());
    expect(onEditInBuilder).toHaveBeenCalledTimes(1);
    expect(onEditWithAria).not.toHaveBeenCalled();
  });

  it('opens Aria for an Aria CV', () => {
    const { onEditInBuilder, onEditWithAria } = mount({ origin: 'aria' });
    openMenu();
    fireEvent.click(ariaRow());
    expect(onEditWithAria).toHaveBeenCalledTimes(1);
    expect(onEditInBuilder).not.toHaveBeenCalled();
  });

  it('does NOT fire the wrong surface when the locked row is clicked', () => {
    // `disabled` already swallows the click in a real browser, but the guard is asserted
    // here because this is the failure that would quietly strand a conversation.
    const { onEditWithAria } = mount({ origin: 'builder' });
    openMenu();
    fireEvent.click(ariaRow());
    expect(onEditWithAria).not.toHaveBeenCalled();
    expect(screen.getAllByRole('menuitem')).toHaveLength(2); // and it stays open
  });

  it('says WHY the locked row is locked', () => {
    // A greyed-out row with no reason is the frustration this menu is supposed to answer.
    mount({ origin: 'aria' });
    openMenu();
    expect(screen.getByText(/written with aria/i)).toBeTruthy();
  });

  it('treats an unknown origin as the builder, so Edit still works', () => {
    // Drafts predating studioKind carry nothing. Falling back to the builder is right on
    // the merits — that IS where an untagged draft is edited — and it keeps the button
    // from becoming two dead rows.
    const { onEditInBuilder } = mount({ origin: undefined });
    openMenu();
    fireEvent.click(builderRow());
    expect(onEditInBuilder).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape and on a click outside', async () => {
    mount();
    openMenu();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryAllByRole('menuitem')).toHaveLength(0));

    openMenu();
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(screen.queryAllByRole('menuitem')).toHaveLength(0));
  });

  it('offers the same two rows as a sheet on mobile', () => {
    // Two presentations, one definition. If the sheet ever drew a different set of rows
    // the phone would be a different product from the desktop.
    const { onEditWithAria } = mount({ origin: 'aria', presentation: 'sheet' });
    openMenu();
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
    expect(builderRow().disabled).toBe(true);
    fireEvent.click(ariaRow());
    expect(onEditWithAria).toHaveBeenCalledTimes(1);
  });
});
