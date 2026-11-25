import '@angular/compiler';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService API Integration', () => {
  let service: AnalyticsService;
  let mockHttp: any;
  let mockConfig: any;
  let mockAuth: any;

  beforeEach(() => {
    mockHttp = {
      get: vi.fn()
    };
    mockConfig = {
      apiUrl: 'http://localhost:8080/api/v1'
    };
    mockAuth = {
      getToken: vi.fn().mockReturnValue('admin-jwt-token')
    };

    service = Object.create(AnalyticsService.prototype);
    (service as any).http = mockHttp;
    (service as any).config = mockConfig;
    (service as any).authService = mockAuth;
  });

  it('queries analytics summary from GET /api/v1/analytics/summary with authorization', () => {
    const summaryData = {
      requests: { total: 100, pending: 40, inProgress: 20, completed: 35, rejected: 5 },
      totalRegisteredStudents: 150,
      completionRate: 35.0,
      avgTurnaroundHours: 12.5,
      stageBottlenecks: { Convocation: 10, Parallel: 15, Department: 5, Principal: 3, Finance: 7 },
      offices: [],
      colleges: []
    };
    mockHttp.get.mockReturnValue(of(summaryData));

    service.getSummary().subscribe(res => {
      expect(res.requests.total).toBe(100);
      expect(res.completionRate).toBe(35.0);
    });

    expect(mockHttp.get).toHaveBeenCalledTimes(1);
    const [url, options] = mockHttp.get.mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/v1/analytics/summary');
    expect(options.headers.get('Authorization')).toBe('Bearer admin-jwt-token');
  });

  it('queries overview metrics from GET /api/v1/analytics/overview', () => {
    const overviewData = {
      totalRequests: 80,
      completedRequests: 40,
      inProgressRequests: 20,
      pendingRequests: 15,
      rejectedRequests: 5,
      completionRate: 50.0,
      totalRegisteredStudents: 120,
      avgTurnaroundHours: 8.4,
      stageBottlenecks: { Convocation: 2, Parallel: 8, Department: 3, Principal: 1, Finance: 1 }
    };
    mockHttp.get.mockReturnValue(of(overviewData));

    service.getOverview().subscribe(res => {
      expect(res.totalRequests).toBe(80);
      expect(res.completionRate).toBe(50.0);
    });

    expect(mockHttp.get).toHaveBeenCalledTimes(1);
    const [url, options] = mockHttp.get.mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/v1/analytics/overview');
    expect(options.headers.get('Authorization')).toBe('Bearer admin-jwt-token');
  });

  it('queries office analytics from GET /api/v1/analytics/offices', () => {
    const officesData = [
      { office: 'Library', totalReviewed: 45, approved: 40, rejected: 5, pending: 10, approvalRate: 88.9 },
      { office: 'Games Coach', totalReviewed: 30, approved: 30, rejected: 0, pending: 5, approvalRate: 100.0 }
    ];
    mockHttp.get.mockReturnValue(of(officesData));

    service.getOffices().subscribe(res => {
      expect(res.length).toBe(2);
      expect(res[0].office).toBe('Library');
    });

    expect(mockHttp.get).toHaveBeenCalledTimes(1);
    const [url, options] = mockHttp.get.mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/v1/analytics/offices');
    expect(options.headers.get('Authorization')).toBe('Bearer admin-jwt-token');
  });

  it('queries department and college metrics from GET /api/v1/analytics/departments', () => {
    const deptsData = [
      {
        college: 'CoICT',
        totalRequests: 60,
        completedRequests: 40,
        departments: [{ department: 'Computer Science & Engineering', total: 60, completed: 40, outstandingDebtsCount: 2 }]
      }
    ];
    mockHttp.get.mockReturnValue(of(deptsData));

    service.getDepartments().subscribe(res => {
      expect(res[0].college).toBe('CoICT');
      expect(res[0].departments[0].outstandingDebtsCount).toBe(2);
    });

    expect(mockHttp.get).toHaveBeenCalledTimes(1);
    const [url, options] = mockHttp.get.mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/v1/analytics/departments');
    expect(options.headers.get('Authorization')).toBe('Bearer admin-jwt-token');
  });

  it('queries clearance high-level analytics summary from GET /api/v1/clearance/analytics-summary', () => {
    mockHttp.get.mockReturnValue(of({ total: 100, completed: 40, pending: 50, rejected: 10 }));

    service.getClearanceAnalyticsSummary().subscribe(res => {
      expect(res.total).toBe(100);
      expect(res.completed).toBe(40);
    });

    expect(mockHttp.get).toHaveBeenCalledTimes(1);
    const [url, options] = mockHttp.get.mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/v1/clearance/analytics-summary');
    expect(options.headers.get('Authorization')).toBe('Bearer admin-jwt-token');
  });
});
