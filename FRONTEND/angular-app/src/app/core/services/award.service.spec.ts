import { describe, expect, it, beforeEach } from 'vitest';
import { AwardService } from './award.service';

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
};

describe('AwardService', () => {
  let service: AwardService;

  beforeEach(() => {
    (globalThis as any).localStorage = createLocalStorageMock();
    service = new AwardService();
  });

  it('should load default awards initially', () => {
    const awards = service.getAwards();
    expect(awards).toEqual([
      'Certificate',
      'Diploma',
      'Bachelor Degree',
      'Postgraduate Diploma',
      'Master Degree',
      'PhD'
    ]);
  });

  it('should add a new award successfully', () => {
    const result = service.addAward('Higher Diploma');
    expect(result).toBe(true);

    const awards = service.getAwards();
    expect(awards).toContain('Higher Diploma');
    expect(awards.length).toBe(7);
  });

  it('should prevent adding duplicate awards case-insensitively', () => {
    service.addAward('Higher Diploma');
    const duplicateResult = service.addAward('higher diploma');
    expect(duplicateResult).toBe(false);

    const awards = service.getAwards();
    expect(awards.filter(a => a.toLowerCase() === 'higher diploma').length).toBe(1);
  });

  it('should delete an existing award successfully', () => {
    service.addAward('Executive MBA');
    expect(service.getAwards()).toContain('Executive MBA');

    const deleted = service.deleteAward('Executive MBA');
    expect(deleted).toBe(true);
    expect(service.getAwards()).not.toContain('Executive MBA');
  });

  it('should reset awards to defaults', () => {
    service.addAward('Custom Award 1');
    service.addAward('Custom Award 2');

    const defaults = service.resetToDefaults();
    expect(defaults).toEqual([
      'Certificate',
      'Diploma',
      'Bachelor Degree',
      'Postgraduate Diploma',
      'Master Degree',
      'PhD'
    ]);
    expect(service.getAwards()).not.toContain('Custom Award 1');
  });
});
