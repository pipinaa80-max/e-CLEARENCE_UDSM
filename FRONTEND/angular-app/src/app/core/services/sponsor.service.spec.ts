import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { of, throwError, Subject } from 'rxjs';
import { SponsorService } from './sponsor.service';

describe('SponsorService Deduplication & Lifecycle Suite', () => {
  it('deduplicates concurrent in-flight getActiveSponsors calls', () => {
    const pending$ = new Subject<any>();
    const mockHttp = {
      get: vi.fn().mockReturnValue(pending$.asObservable())
    };
    const mockConfig = { apiUrl: '/api/v1' };

    const service = Object.create(SponsorService.prototype);
    (service as any).http = mockHttp;
    (service as any).config = mockConfig;
    (service as any).storage = { get: vi.fn().mockReturnValue(null) };
    (service as any).defaultSponsors = [
      { name: 'HESLB', code: 'HESLB', isActive: true }
    ];
    const { BehaviorSubject } = require('rxjs');
    (service as any).sponsorsSubject = new BehaviorSubject([]);

    // Call twice concurrently while request is in-flight
    let result1: any, result2: any;
    service.getActiveSponsors().subscribe((val: any) => { result1 = val; });
    service.getActiveSponsors().subscribe((val: any) => { result2 = val; });

    // Must make only 1 HTTP call
    expect(mockHttp.get).toHaveBeenCalledTimes(1);
    expect(mockHttp.get).toHaveBeenCalledWith('/api/v1/sponsors');

    // Emit result
    pending$.next([
      { id: '1', name: 'HESLB', code: 'HESLB', isActive: true },
      { id: '2', name: 'PRIVATE', code: 'PRIVATE', isActive: true }
    ]);
    pending$.complete();

    expect(result1.length).toBe(2);
    expect(result2.length).toBe(2);
  });

  it('falls back to default sponsors gracefully when backend fails with error', () => {
    const mockHttp = {
      get: vi.fn().mockReturnValue(throwError(() => new Error('404 Not Found')))
    };
    const mockConfig = { apiUrl: '/api/v1' };

    const service = Object.create(SponsorService.prototype);
    (service as any).http = mockHttp;
    (service as any).config = mockConfig;
    (service as any).storage = { get: vi.fn().mockReturnValue(null) };
    (service as any).defaultSponsors = [
      { name: 'HESLB', code: 'HESLB', isActive: true }
    ];
    const { BehaviorSubject } = require('rxjs');
    (service as any).sponsorsSubject = new BehaviorSubject((service as any).defaultSponsors);

    let result: any;
    service.getActiveSponsors().subscribe((val: any) => { result = val; });

    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('HESLB');
  });

  it('resets in-flight reference after stream completion so subsequent calls can fetch fresh data', () => {
    const mockHttp = {
      get: vi.fn().mockReturnValue(of([{ id: '1', name: 'HESLB', code: 'HESLB', isActive: true }]))
    };
    const mockConfig = { apiUrl: '/api/v1' };

    const service = Object.create(SponsorService.prototype);
    (service as any).http = mockHttp;
    (service as any).config = mockConfig;
    (service as any).storage = { get: vi.fn().mockReturnValue(null) };
    (service as any).defaultSponsors = [];
    const { BehaviorSubject } = require('rxjs');
    (service as any).sponsorsSubject = new BehaviorSubject([]);

    service.getActiveSponsors().subscribe();
    expect(mockHttp.get).toHaveBeenCalledTimes(1);

    // After completion, inFlight must be null
    expect((service as any).activeSponsorsInFlight$).toBeNull();

    // A subsequent call triggers a new request
    service.getActiveSponsors().subscribe();
    expect(mockHttp.get).toHaveBeenCalledTimes(2);
  });
});
