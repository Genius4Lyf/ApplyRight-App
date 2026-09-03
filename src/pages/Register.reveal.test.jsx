// @vitest-environment jsdom
//
// Signup asks one thing at a time: prove the mailbox, THEN fill in the account. What is
// pinned here is the gate itself — that the fields past the proof are genuinely absent
// (not merely disabled) before verification, that they arrive after it, and that editing
// the address puts them away again. The last one is the security-relevant case: without
// it someone could verify one address and submit a different one.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import '../i18n';

vi.mock('../services/api', () => ({ default: { post: vi.fn(), get: vi.fn() } }));

import api from '../services/api';
import Register from './Register';

const mount = () =>
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );

// The revealed half, named the way a user would name it.
const hiddenFields = [/^password$/i, /confirm password/i, /referral/i];
const submit = () => screen.queryByRole('button', { name: /create account|get started|sign up/i });

beforeEach(() => {
  vi.clearAllMocks();
  api.post.mockResolvedValue({ data: { success: true } });
  // jsdom has no layout, so the reveal's scrollIntoView would throw.
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => cleanup());

const verify = async () => {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'someone@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: /send code/i }));
  const code = await screen.findByLabelText(/enter the code/i);
  fireEvent.change(code, { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: /^verify$/i }));
};

describe('Register — the form past the mailbox proof', () => {
  it('shows only the email step before verification', () => {
    mount();

    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    // Absent, not disabled: a disabled wall of inputs is the thing this replaced.
    for (const field of hiddenFields) expect(screen.queryByLabelText(field)).toBeNull();
    expect(submit()).toBeNull();
  });

  it('reveals the rest once the code is confirmed', async () => {
    mount();
    await verify();

    for (const field of hiddenFields) {
      expect(await screen.findByLabelText(field)).toBeTruthy();
    }
    expect(submit()).toBeTruthy();
  });

  it('puts the form away again when the address is edited after verifying', async () => {
    mount();
    await verify();
    await screen.findByLabelText(/^password$/i);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'other@example.com' } });

    // The proof no longer applies to the address on screen, so the account form must
    // not be submittable against it.
    await waitFor(() => expect(screen.queryByLabelText(/^password$/i)).toBeNull());
    expect(submit()).toBeNull();
  });
});
