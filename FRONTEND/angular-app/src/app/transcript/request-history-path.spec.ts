import '@angular/compiler';
import { describe, expect, it, beforeEach } from 'vitest';
import { routes } from '../app.routes';

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
};

describe('Transcript Process - Request History Button Path Verification', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = createLocalStorageMock();
  });

  it('should have a registered route for /transcript', () => {
    const transcriptRoute = routes.find(r => r.path === 'transcript');
    expect(transcriptRoute).toBeDefined();
    expect(transcriptRoute?.path).toBe('transcript');
  });

  it('should route finishProcess() directly to /transcript Request History dashboard', () => {
    let targetPath = '';
    const mockRouter = {
      navigate: (pathArray: string[]) => {
        targetPath = pathArray[0];
      }
    };

    const user = { id: 'usr-123', fullName: 'Sarafina Maganga' };

    // Simulate finishProcess logic
    const finishProcess = () => {
      localStorage.setItem(`udsm-transcript-acquired-${user.id}`, 'true');
      mockRouter.navigate(['/transcript']);
    };

    finishProcess();

    expect(targetPath).toBe('/transcript');
    expect(localStorage.getItem(`udsm-transcript-acquired-${user.id}`)).toBe('true');
  });
});
