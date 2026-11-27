import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { normalizeUdsmBrandColor } from '../config/udsm-brand-colors';
import { ConfigService } from './config.service';

/** Converts local asset paths and workspace paths into URLs served by Angular. */
export function normalizeBrandAssetUrl(value: string | null | undefined, fallback = ''): string {
  let url = (value || '').trim().replace(/\\/g, '/');
  if (!url) return fallback;
  if (/^(https?:|data:image\/|blob:|\/\/)/i.test(url)) return url;
  // Admins often paste a host name without the scheme. Treat it as a remote URL
  // instead of incorrectly resolving it as an Angular-local asset path.
  if (/^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[:/]|$)/i.test(url)) return `https://${url}`;
  if (url.toLowerCase() === 'none') return 'none';

  const publicPathIndex = url.toLowerCase().lastIndexOf('/public/');
  if (publicPathIndex >= 0) {
    url = url.slice(publicPathIndex);
  } else if (url.toLowerCase().startsWith('public/')) {
    url = `/${url}`;
  }

  return `/${url.replace(/^\.\/+/, '').replace(/^\/+/, '')}`;
}

export interface ProjectDashboard {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface ProjectConfig {
  projectId: string;
  branding: {
    universityName: string;
    shortName: string;
    logoUrl: string;
    backgroundUrl: string;
    primaryColor: string;
    fontFamily: string;
    footerLinks?: { label: string; url: string }[];
  };
  dashboards: ProjectDashboard[];
}

@Injectable({ providedIn: 'root' })
export class ProjectAdminService {
  private readonly http = inject(HttpClient);
  private readonly configService = inject(ConfigService);
  private get apiUrl(): string {
    return `${this.configService.apiUrl}/control-plane`;
  }

  private headers(): HttpHeaders {
    const token = localStorage.getItem('udsm-auth-token')?.replace(/^"|"$/g, '');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  /** Retrieves branding from localStorage for immediate UI application. */
  getSavedBranding(): Partial<ProjectConfig['branding']> | null {
    const raw = localStorage.getItem('udsm-project-branding');
    try {
      const branding = raw ? JSON.parse(raw) as Partial<ProjectConfig['branding']> : null;
      if (branding) {
        if (!branding.universityName || branding.universityName.trim().toLowerCase() === 'udsm') {
          branding.universityName = 'University of Dar es Salaam';
        }
        if (!branding.shortName || branding.shortName.trim().toLowerCase() === 'udsm') {
          branding.shortName = 'University of Dar es Salaam';
        }
      }
      return branding
        ? { ...branding, primaryColor: normalizeUdsmBrandColor(branding.primaryColor) }
        : null;
    } catch {
      return null;
    }
  }

  /** Persists branding to localStorage with a freshness timestamp. */
  setSavedBranding(branding: Partial<ProjectConfig['branding']>): void {
    const current = this.getSavedBranding() || {};
    localStorage.setItem('udsm-project-branding', JSON.stringify({
      ...current,
      ...branding,
      primaryColor: normalizeUdsmBrandColor(branding.primaryColor ?? current.primaryColor)
    }));
    localStorage.setItem('udsm-project-branding-fetched-at', String(Date.now()));
  }

  /** Returns true if branding was fetched within the TTL window (default 12h). */
  isSavedBrandingFresh(maxAgeMs: number = 12 * 60 * 60 * 1000): boolean {
    try {
      const ts = Number(localStorage.getItem('udsm-project-branding-fetched-at') || 0);
      return ts > 0 && (Date.now() - ts) < maxAgeMs;
    } catch {
      return false;
    }
  }

  getProjectConfig(): Observable<ProjectConfig> {
    return this.http.get<ProjectConfig>(`${this.apiUrl}/overview`, { headers: this.headers() });
  }

  getPublicBranding(): Observable<ProjectConfig['branding']> {
    return this.http.get<ProjectConfig['branding']>(`${this.apiUrl}/public/branding`, {
      headers: new HttpHeaders({ 'X-Skip-Error-Toast': 'true' })
    });
  }

  getMyBranding(): Observable<ProjectConfig['branding']> {
    return this.http.get<ProjectConfig['branding']>(`${this.apiUrl}/branding/current`, {
      headers: this.headers().set('X-Skip-Error-Toast', 'true')
    });
  }

  createDashboard(data: Pick<ProjectDashboard, 'id' | 'name' | 'description'>): Observable<ProjectDashboard> {
    return this.http.post<ProjectDashboard>(`${this.apiUrl}/dashboards`, data, { headers: this.headers() });
  }

  updateDashboard(dashboard: ProjectDashboard): Observable<ProjectDashboard> {
    return this.http.put<ProjectDashboard>(`${this.apiUrl}/dashboards/${dashboard.id}`, dashboard, { headers: this.headers() });
  }

  deleteDashboard(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/dashboards/${id}`, { headers: this.headers() });
  }

  updateBranding(branding: ProjectConfig['branding']): Observable<ProjectConfig['branding']> {
    const approvedBranding = {
      ...branding,
      primaryColor: normalizeUdsmBrandColor(branding.primaryColor)
    };
    return this.http.put<ProjectConfig['branding']>(`${this.apiUrl}/branding`, approvedBranding, { headers: this.headers() });
  }
}
