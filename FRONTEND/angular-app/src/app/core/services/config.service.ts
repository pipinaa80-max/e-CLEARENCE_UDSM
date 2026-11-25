import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

declare global {
  interface Window {
    __APP_CONFIG__?: {
      apiUrl?: string;
    };
    API_BASE_URL?: string;
  }
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private customApiUrl: string | null = null;

  /**
   * Returns the resolved API base URL dynamically based on environment configuration:
   * 1. Explicit runtime override via setApiUrl()
   * 2. Window runtime configuration (window.__APP_CONFIG__.apiUrl or window.API_BASE_URL)
   * 3. LocalStorage override ('UDSM_API_BASE_URL') for manual environment testing
   * 4. Safe relative fallback '/api/v1' if deployed behind a reverse proxy or non-localhost
   * 5. Default 'http://localhost:8080/api/v1' for local standalone development
   *
   * This ensures the application is not permanently locked to localhost, while avoiding
   * any invented or assumed production domain names.
   */
  get apiUrl(): string {
    if (this.customApiUrl) {
      return this.customApiUrl;
    }

    if (typeof window !== 'undefined') {
      // 1. Runtime window configuration (injected at deploy time or container startup)
      if (window.__APP_CONFIG__?.apiUrl) {
        return window.__APP_CONFIG__.apiUrl.replace(/\/+$/, '');
      }
      if (window.API_BASE_URL) {
        return window.API_BASE_URL.replace(/\/+$/, '');
      }

      // 2. Local storage override for testing different environments
      try {
        const stored = localStorage.getItem('UDSM_API_BASE_URL');
        if (stored) {
          return stored.replace(/\/+$/, '');
        }
      } catch {
        // Safe fallback if localStorage is disabled or restricted
      }

      // 3. When deployed on a non-localhost host (e.g. TanzaniaServers DirectAdmin / reverse proxy),
      // use the production build environment.apiUrl (or relative '/api/v1' fallback).
      if (window.location && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        if (environment.production && environment.apiUrl) {
          return environment.apiUrl.replace(/\/+$/, '');
        }
        return '/api/v1';
      }
    }

    // 4. Default fallback for local standalone development
    return 'http://localhost:8080/api/v1';
  }

  /**
   * Returns the backend origin without the /api/v1 path suffix (e.g. https://api-clearance.jmsolutions.co.tz)
   * so relative backend asset/download paths (/uploads/..., /api/v1/...) resolve cleanly across subdomains.
   */
  get apiOrigin(): string {
    return this.apiUrl.replace(/\/api\/v1\/?$/i, '');
  }

  /**
   * Returns the resolved Control-Plane / Superuser API URL dynamically.
   */
  get superuserApiUrl(): string {
    if (typeof window !== 'undefined') {
      if ((window as any).__APP_CONFIG__?.superuserApiUrl) {
        return (window as any).__APP_CONFIG__.superuserApiUrl.replace(/\/+$/, '');
      }
      try {
        const stored = localStorage.getItem('UDSM_SUPERUSER_API_URL');
        if (stored) {
          return stored.replace(/\/+$/, '');
        }
      } catch {
        // Safe fallback
      }
      if (window.location && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return '/control-plane';
      }
    }
    return 'http://localhost:8090/api';
  }

  setApiUrl(url: string): void {
    this.customApiUrl = url;
  }
}