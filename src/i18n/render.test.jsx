// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import i18n from './index';
import en from './locales/en.json';

// Proves the three guarantees the whole incremental-translation plan rests on:
//   1. French keys render in French
//   2. a key that exists ONLY in English still renders English (fallbackLng)
//   3. a key that exists in NEITHER renders something readable, never blank
const Probe = ({ k, opts }) => {
  const { t } = useTranslation();
  return <span data-testid="out">{t(k, opts)}</span>;
};

const setLang = async (lng) => {
  await act(async () => {
    await i18n.changeLanguage(lng);
  });
};

beforeEach(async () => {
  await setLang('en');
});
afterEach(cleanup);

describe('rendering in French', () => {
  it('renders translated auth copy', async () => {
    await setLang('fr');
    render(<Probe k="auth.login.title" />);
    expect(screen.getByTestId('out').textContent).toBe('Ravi de vous revoir');
  });

  it('renders translated navbar copy', async () => {
    await setLang('fr');
    render(<Probe k="nav.myApplications" />);
    expect(screen.getByTestId('out').textContent).toBe('Mes candidatures');
  });

  it('interpolates into French copy', async () => {
    await setLang('fr');
    render(<Probe k="common.copyright" opts={{ year: 2026 }} />);
    expect(screen.getByTestId('out').textContent).toBe('© 2026 ApplyRight. Tous droits réservés.');
  });

  it('applies French plural rules', async () => {
    await setLang('fr');
    const { rerender } = render(<Probe k="nav.account.creditsLeft" opts={{ count: 1 }} />);
    expect(screen.getByTestId('out').textContent).toBe('1 restant');
    rerender(<Probe k="nav.account.creditsLeft" opts={{ count: 7 }} />);
    expect(screen.getByTestId('out').textContent).toBe('7 restants');
  });
});

describe('fallback — what makes incremental translation safe', () => {
  it('an untranslated key renders ENGLISH, not blank and not the key path', async () => {
    // Simulates a surface a later round has not reached yet: present in en.json,
    // absent from fr.json.
    i18n.addResource(
      'en',
      'translation',
      'dashboard.notYetTranslated',
      'Welcome to your dashboard'
    );
    await setLang('fr');
    render(<Probe k="dashboard.notYetTranslated" />);
    const out = screen.getByTestId('out').textContent;
    expect(out).toBe('Welcome to your dashboard');
    expect(out).not.toBe('');
    expect(out).not.toContain('dashboard.');
  });

  it('an empty French string also falls back to English', async () => {
    i18n.addResource('en', 'translation', 'dashboard.emptyInFr', 'English text');
    i18n.addResource('fr', 'translation', 'dashboard.emptyInFr', '');
    await setLang('fr');
    render(<Probe k="dashboard.emptyInFr" />);
    expect(screen.getByTestId('out').textContent).toBe('English text');
  });

  it('a key missing everywhere renders the key, never a blank node', async () => {
    await setLang('fr');
    render(<Probe k="nope.does.not.exist" />);
    expect(screen.getByTestId('out').textContent).toBe('nope.does.not.exist');
  });
});

describe('regional locales', () => {
  it.each(['fr-FR', 'fr-CA', 'fr-CI', 'fr-BE'])('%s resolves to fr', async (tag) => {
    await setLang(tag);
    expect(i18n.resolvedLanguage).toBe('fr');
    render(<Probe k="nav.dashboard" />);
    expect(screen.getByTestId('out').textContent).toBe('Tableau de bord');
    cleanup();
  });

  it('an unsupported locale resolves to the English fallback', async () => {
    await setLang('de-DE');
    render(<Probe k="nav.dashboard" />);
    expect(screen.getByTestId('out').textContent).toBe(en.nav.dashboard);
  });
});
