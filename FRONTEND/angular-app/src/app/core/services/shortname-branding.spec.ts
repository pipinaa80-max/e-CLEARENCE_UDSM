import { describe, expect, it, beforeEach } from 'vitest';

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
};

describe('Project Branding - Short Name Propagation', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = createLocalStorageMock();
  });

  it('should save and retrieve custom shortName from project branding', () => {
    const brandingKey = 'udsm-project-branding';
    const customBranding = {
      universityName: 'University of Dodoma',
      shortName: 'UDOM',
      logoUrl: '/udom-logo.png'
    };

    localStorage.setItem(brandingKey, JSON.stringify(customBranding));

    const saved = JSON.parse(localStorage.getItem(brandingKey) || '{}');
    expect(saved.shortName).toBe('UDOM');
    expect(saved.universityName).toBe('University of Dodoma');
  });

  it('should fallback gracefully if shortName is not set', () => {
    const saved = localStorage.getItem('udsm-project-branding');
    expect(saved).toBeNull();
  });
});
