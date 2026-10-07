import { describe, expect, it, beforeEach } from 'vitest';
import { SubdomainService } from './subdomain.service';

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
};

describe('Subdomain Service - Automatic Subdomain Generation & Tenant Resolution', () => {
  let subdomainService: SubdomainService;

  beforeEach(() => {
    (globalThis as any).localStorage = createLocalStorageMock();
    subdomainService = new SubdomainService();
  });

  it('should automatically generate subdomain slug from college/campus title with parentheses', () => {
    const slug1 = subdomainService.generateSlug('Dar es Salaam University College of Education (DUCE)');
    expect(slug1).toBe('duce');

    const slug2 = subdomainService.generateSlug('College of Information and Communication Technologies (CoICT)');
    expect(slug2).toBe('coict');

    const slug3 = subdomainService.generateSlug('Mkwawa University College of Education (MUCE)');
    expect(slug3).toBe('muce');
  });

  it('should generate clean hyphenated slug when no parentheses are present', () => {
    const slug = subdomainService.generateSlug('Dodoma Campus Central Office');
    expect(slug).toBe('dodoma-campus-central-office');
  });

  it('should create and retrieve new subdomain tenants', () => {
    const created = subdomainService.createSubdomain({
      subdomain: 'sjmc',
      title: 'School of Journalism and Mass Communication (SJMC)',
      shortName: 'SJMC',
      adminEmail: 'principal.sjmc@udsm.ac.tz',
      active: true
    });

    expect(created).not.toBeNull();
    expect(created?.subdomain).toBe('sjmc');

    const list = subdomainService.getSubdomains();
    expect(list.some(t => t.subdomain === 'sjmc')).toBe(true);
  });

  it('should reject duplicate subdomain creation', () => {
    const first = subdomainService.createSubdomain({
      subdomain: 'duce',
      title: 'Dar es Salaam University College of Education (DUCE)',
      shortName: 'DUCE',
      adminEmail: 'duce@udsm.ac.tz',
      active: true
    });

    // Default 'duce' already exists initially
    expect(first).toBeNull();
  });
});
