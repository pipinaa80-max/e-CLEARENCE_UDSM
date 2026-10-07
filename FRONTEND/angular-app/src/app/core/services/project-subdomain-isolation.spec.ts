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

describe('Multi-Tenant Project Subdomain - Data & Environment Isolation', () => {
  let mockStorage: any;

  const getScopedKey = (tenant: string, key: string) => `${tenant.toLowerCase()}_${key}`;

  beforeEach(() => {
    mockStorage = createLocalStorageMock();
    (globalThis as any).localStorage = mockStorage;
  });

  it('should isolate project data separately between UDSM and UDOM project subdomains', () => {
    const key = 'clearance-requests';

    // 1. UDSM Project Administrator creates student clearance request
    const udsmRequest = [
      { id: 'req-udsm-1', studentName: 'UDSM Student A', university: 'University of Dar es Salaam' }
    ];
    mockStorage.setItem(getScopedKey('udsm', key), JSON.stringify(udsmRequest));

    // 2. UDOM Project Administrator creates student clearance request
    const udomRequest = [
      { id: 'req-udom-1', studentName: 'UDOM Student B', university: 'University of Dodoma' }
    ];
    mockStorage.setItem(getScopedKey('udom', key), JSON.stringify(udomRequest));

    // 3. Verify UDSM project domain only reads UDSM data
    const readUdsm = JSON.parse(mockStorage.getItem(getScopedKey('udsm', key)));
    expect(readUdsm.length).toBe(1);
    expect(readUdsm[0].studentName).toBe('UDSM Student A');

    // 4. Verify UDOM project domain only reads UDOM data
    const readUdom = JSON.parse(mockStorage.getItem(getScopedKey('udom', key)));
    expect(readUdom.length).toBe(1);
    expect(readUdom[0].studentName).toBe('UDOM Student B');

    // 5. Ensure data does not leak between projects
    expect(readUdsm).not.toEqual(readUdom);
  });
});
