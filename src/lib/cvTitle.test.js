import { describe, it, expect } from 'vitest';
import { isUnnamedCv, firstNameFrom, UNTITLED_CV } from './cvTitle';

describe('isUnnamedCv', () => {
  it('treats blank and the "Untitled CV" default as unnamed', () => {
    expect(isUnnamedCv('')).toBe(true);
    expect(isUnnamedCv('   ')).toBe(true);
    expect(isUnnamedCv(undefined)).toBe(true);
    expect(isUnnamedCv(null)).toBe(true);
    expect(isUnnamedCv(UNTITLED_CV)).toBe(true);
    expect(isUnnamedCv('  Untitled CV  ')).toBe(true);
  });

  it('treats any real, user-typed title as NAMED (never to be overwritten)', () => {
    expect(isUnnamedCv('CV for Barista')).toBe(false);
    expect(isUnnamedCv("Ernest's CV")).toBe(false);
    expect(isUnnamedCv('My Résumé')).toBe(false);
    // A near-miss of the default is still a real name — only the exact default is unnamed.
    expect(isUnnamedCv('Untitled CV v2')).toBe(false);
  });
});

describe('firstNameFrom', () => {
  it('prefers an explicit firstName', () => {
    expect(firstNameFrom({ firstName: 'Ada', fullName: 'Someone Else' })).toBe('Ada');
    expect(firstNameFrom({ firstName: '  Ada  ' })).toBe('Ada');
  });

  it('falls back to the first token of the full name', () => {
    expect(firstNameFrom({ fullName: 'Ernest Akibor' })).toBe('Ernest');
    expect(firstNameFrom({ name: 'Chidi Okonkwo' })).toBe('Chidi');
    expect(firstNameFrom({ fullName: '  Grace   Umeh ' })).toBe('Grace');
  });

  it('returns empty string when there is no name to use (never fabricates)', () => {
    expect(firstNameFrom({})).toBe('');
    expect(firstNameFrom()).toBe('');
    expect(firstNameFrom({ email: 'x@y.com' })).toBe('');
  });
});
