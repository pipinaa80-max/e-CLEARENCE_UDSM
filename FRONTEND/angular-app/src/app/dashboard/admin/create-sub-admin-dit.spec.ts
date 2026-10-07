import { describe, expect, it, beforeEach } from 'vitest';
import { SubdomainService } from '../../core/services/subdomain.service';

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
};

describe('Admin Dashboard - Create Sub-Admin for DIT Verification', () => {
  let subdomainService: SubdomainService;

  beforeEach(() => {
    (globalThis as any).localStorage = createLocalStorageMock();
    subdomainService = new SubdomainService();
  });

  it('should automatically generate subdomain "dit" when selecting Dar es Salaam Institute of Technology (DIT)', () => {
    const collegeTitle = 'Dar es Salaam Institute of Technology (DIT)';
    const slug = subdomainService.generateSlug(collegeTitle);

    expect(slug).toBe('dit');
  });

  it('should register DIT Sub-Admin and provision the DIT subdomain tenant', () => {
    const subAdminUser = {
      firstName: 'Joseph',
      middleName: 'John',
      lastName: 'Mkwawa',
      email: 'joseph.mkwawa@dit.ac.tz',
      staffId: 'DIT-STAFF-001',
      role: 'ADMINISTRATOR',
      college: 'Dar es Salaam Institute of Technology (DIT)'
    };

    const slug = subdomainService.generateSlug(subAdminUser.college);

    const createdTenant = subdomainService.createSubdomain({
      subdomain: slug,
      title: subAdminUser.college,
      shortName: 'DIT',
      adminEmail: subAdminUser.email,
      primaryColor: '#00679b',
      active: true
    });

    expect(createdTenant).not.toBeNull();
    expect(createdTenant?.subdomain).toBe('dit');
    expect(createdTenant?.shortName).toBe('DIT');
    expect(createdTenant?.adminEmail).toBe('joseph.mkwawa@dit.ac.tz');

    // Verify subdomains list contains DIT
    const activeSubdomains = subdomainService.getSubdomains();
    const ditTenant = activeSubdomains.find(t => t.subdomain === 'dit');
    expect(ditTenant).toBeDefined();
    expect(ditTenant?.title).toBe('Dar es Salaam Institute of Technology (DIT)');
  });
});
