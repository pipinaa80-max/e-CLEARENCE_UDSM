// src/app/core/services/analytics.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { AuthService } from './auth.service';

export interface AnalyticsOverview {
  totalRequests: number;
  completedRequests: number;
  inProgressRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
  completionRate: number;
  totalRegisteredStudents: number;
  avgTurnaroundHours: number;
  stageBottlenecks: Record<string, number>;
}

export interface AnalyticsSummary {
  requests: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    rejected: number;
  };
  totalRegisteredStudents: number;
  completionRate: number;
  avgTurnaroundHours: number;
  stageBottlenecks: Record<string, number>;
  offices: Array<{
    office: string;
    totalReviewed: number;
    approved: number;
    rejected: number;
    pending: number;
    approvalRate: number;
  }>;
  colleges: Array<{
    college: string;
    totalRequests: number;
    completedRequests: number;
    departments: Array<any>;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly authService = inject(AuthService);

  private get authHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }

  getSummary(): Observable<AnalyticsSummary> {
    return this.http.get<AnalyticsSummary>(`${this.config.apiUrl}/analytics/summary`, {
      headers: this.authHeaders
    });
  }

  getOverview(): Observable<AnalyticsOverview> {
    return this.http.get<AnalyticsOverview>(`${this.config.apiUrl}/analytics/overview`, {
      headers: this.authHeaders
    });
  }

  getOffices(): Observable<any[]> {
    return this.http.get<any[]>(`${this.config.apiUrl}/analytics/offices`, {
      headers: this.authHeaders
    });
  }

  getDepartments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.config.apiUrl}/analytics/departments`, {
      headers: this.authHeaders
    });
  }

  getClearanceAnalyticsSummary(): Observable<any> {
    return this.http.get<any>(`${this.config.apiUrl}/clearance/analytics-summary`, {
      headers: this.authHeaders
    });
  }
}
