import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigService } from './config.service';

describe('ConfigService', () => {
  let service: ConfigService;
  const originalWindow = (globalThis as any).window;

  beforeEach(() => {
    service = new ConfigService();
    (globalThis as any).window = (globalThis as any).window || {};
    delete (globalThis as any).window.__APP_CONFIG__;
    delete (globalThis as any).window.API_BASE_URL;
  });

  afterEach(() => {
    if (originalWindow) {
      (globalThis as any).window = originalWindow;
    } else {
      delete (globalThis as any).window;
    }
  });

  it('should default to local development URL on localhost environment', () => {
    expect(service.apiUrl).toBe('http://localhost:8080/api/v1');
  });

  it('should allow programmatic override via setApiUrl()', () => {
    service.setApiUrl('https://custom-server.local/api/v1');
    expect(service.apiUrl).toBe('https://custom-server.local/api/v1');
  });

  it('should read from window.__APP_CONFIG__.apiUrl when present', () => {
    (globalThis as any).window.__APP_CONFIG__ = { apiUrl: 'https://gateway.institution.ac.tz/api/v1/' };
    expect(service.apiUrl).toBe('https://gateway.institution.ac.tz/api/v1');
  });

  it('should read from window.API_BASE_URL when present', () => {
    (globalThis as any).window.API_BASE_URL = 'https://api.institution.ac.tz/api/v1/';
    expect(service.apiUrl).toBe('https://api.institution.ac.tz/api/v1');
  });
});
