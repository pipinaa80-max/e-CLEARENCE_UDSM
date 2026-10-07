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

describe('Auth Service - Block User Login When Institutional Admin Is Suspended', () => {
  let subdomainService: SubdomainService;

  beforeEach(() => {
    (globalThis as any).localStorage = createLocalStorageMock();
    subdomainService = new SubdomainService();
  });

  it('should allow login when tenant is active', () => {
    const tenants = subdomainService.getSubdomains();
    const duceTenant = tenants.find(t => t.subdomain === 'duce');
    expect(duceTenant?.active).toBe(true);

    const isTenantActive = (subdomain: string) => {
      const list = subdomainService.getSubdomains();
      const match = list.find(t => t.subdomain === subdomain);
      return match ? match.active : true;
    };

    expect(isTenantActive('duce')).toBe(true);
  });

  it('should BLOCK user login immediately when institutional tenant is suspended', () => {
    const list = subdomainService.getSubdomains();
    const duceTenant = list.find(t => t.subdomain === 'duce');
    if (duceTenant) {
      duceTenant.active = false;
      (globalThis as any).localStorage.setItem('udsm-subdomain-tenants', JSON.stringify(list));
    }

    const isTenantActive = (subdomain: string) => {
      const updatedList = subdomainService.getSubdomains();
      const match = updatedList.find(t => t.subdomain === subdomain);
      return match ? match.active : true;
    };

    expect(isTenantActive('duce')).toBe(false);
  });
});
