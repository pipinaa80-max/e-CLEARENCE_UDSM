import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

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
    primaryColor: string;
    fontFamily: string;
  };
  dashboards: ProjectDashboard[];
}

@Injectable({ providedIn: 'root' })
export class ProjectAdminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8090/api';

  private headers(): HttpHeaders {
    const token = localStorage.getItem('udsm-auth-token')?.replace(/^"|"$/g, '');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  /** @deprecated Branding is now read from clearance_db; retained for API compatibility. */
  getSavedBranding(): Partial<ProjectConfig['branding']> | null {
    return null;
  }

  /** @deprecated Branding is persisted through updateBranding(). */
  setSavedBranding(_branding: Partial<ProjectConfig['branding']>): void {
    // Intentionally no local fallback.
  }

  getProjectConfig(): Observable<ProjectConfig> {
    return this.http.get<ProjectConfig>(`${this.apiUrl}/overview`, { headers: this.headers() });
  }

  getPublicBranding(): Observable<ProjectConfig['branding']> {
    return this.http.get<ProjectConfig['branding']>(`${this.apiUrl}/public/branding`);
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
    return this.http.put<ProjectConfig['branding']>(`${this.apiUrl}/branding`, branding, { headers: this.headers() });
  }
}
