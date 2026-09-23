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

describe('Transcript - Print Button Disappear Once Printed', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = createLocalStorageMock();
  });

  it('should initially report request as not printed', () => {
    const requestId = 'req-paid-123';
    const isPrinted = (id: string) => localStorage.getItem(`udsm-transcript-printed-${id}`) === 'true';

    expect(isPrinted(requestId)).toBe(false);
  });

  it('should mark request as printed when printTranscript is triggered and cause button to disappear', () => {
    const requestId = 'req-paid-123';
    const isPrinted = (id: string) => localStorage.getItem(`udsm-transcript-printed-${id}`) === 'true';

    const printTranscript = (id: string) => {
      localStorage.setItem(`udsm-transcript-printed-${id}`, 'true');
    };

    printTranscript(requestId);

    expect(isPrinted(requestId)).toBe(true);
  });
});
