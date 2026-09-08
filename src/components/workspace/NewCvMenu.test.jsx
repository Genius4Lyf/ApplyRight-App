// @vitest-environment jsdom
//
// The menu exists because there are two ways to build a CV and picking between them is a
// real decision. What these tests hold is that it stays a MENU — one that closes the way
// every other menu in the rail closes, and that never fires the wrong path.
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react';

import '../../i18n';
import NewCvMenu from './NewCvMenu';

const mount = (props = {}) =>
  render(
    <NewCvMenu
      onBuildWithAria={vi.fn()}
      onBuildWithBuilder={vi.fn()}
      onInterview={vi.fn()}
      {...props}
    />
  );

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: /start a new cv/i }));

afterEach(() => cleanup());

describe('NewCvMenu', () => {
  it('keeps both build paths behind the trigger until it is opened', () => {
    mount();
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
    openMenu();
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
  });

  it('offers no upload path — that is Aria’s, and only hers', async () => {
    // Uploading an existing CV briefly lived in this menu, after the dashboard that
    // owned it was deleted. It was taken out again on purpose: Aria's build session
    // takes a file at the point where it already knows the career stage and the target
    // job (StudioUploadCard), so the document lands somewhere that can do something
    // with it. A second upload here would be the same action stripped of that context,
    // and two doors to one feature is how users end up choosing the worse one.
    mount({ onUploadCv: vi.fn() });
    openMenu();

    expect(screen.queryByRole('menuitem', { name: /upload/i })).toBeNull();
    // ...and the menu is still exactly the two ways to BUILD one.
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
  });

  it('names what each path IS, not just that it exists', () => {
    // Two items reading "Build with Aria" and "Build with CV Studio" are the same
    // sentence twice to someone who has used neither. The hint is what makes it a choice.
    mount();
    openMenu();
    expect(screen.getByText(/a conversation that writes it with you/i)).toBeTruthy();
    expect(screen.getByText(/step-by-step form/i)).toBeTruthy();
  });

  it('closes on Escape and on a click outside', async () => {
    mount();
    // waitFor: the menu leaves through an exit animation, so it is still in the DOM for a
    // beat after the gesture that dismissed it.
    const gone = () => waitFor(() => expect(screen.queryAllByRole('menuitem')).toHaveLength(0));

    openMenu();
    fireEvent.keyDown(document, { key: 'Escape' });
    await gone();

    openMenu();
    fireEvent.pointerDown(document.body);
    await gone();
  });

  it('leaves Interview outside the menu — it is a different job, not a third way to build', () => {
    const onInterview = vi.fn();
    const onBuildWithAria = vi.fn();
    mount({ onInterview, onBuildWithAria });

    fireEvent.click(screen.getByRole('button', { name: /prepare for an interview/i }));
    expect(onInterview).toHaveBeenCalled();
    expect(onBuildWithAria).not.toHaveBeenCalled();
  });
});
