import '@angular/compiler';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { of, Subject } from 'rxjs';
import { ClearanceService } from './clearance.service';
import { NotificationService } from './notification.service';

describe('Request Loop & Duplicate Request Prevention Suite', () => {
  let clearanceService: ClearanceService;
  let notificationService: NotificationService;
  let mockHttp: any;
  let mockConfig: any;

  beforeEach(() => {
    mockHttp = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn()
    };
    mockConfig = {
      apiUrl: 'http://localhost:8080/api/v1'
    };

    clearanceService = Object.create(ClearanceService.prototype);
    (clearanceService as any).http = mockHttp;
    (clearanceService as any).config = mockConfig;
    (clearanceService as any).requestKey = 'udsm-clearance-requests';
    (clearanceService as any).draftKey = 'udsm-clearance-drafts';
    (clearanceService as any).storage = {
      get: vi.fn((key: string) => {
        if (key === 'udsm-auth-token') return 'mock-jwt-token';
        if (key === 'udsm-auth-user') return { id: 'std-1', registrationNumber: '2022-04-01234' };
        if (key === 'udsm-clearance-requests') return [
          {
            id: 'req-1',
            studentId: 'std-1',
            registrationNumber: '2022-04-01234',
            status: 'Pending',
            currentStage: 'Library',
            approvals: [
              { office: 'Library', status: 'Pending' },
              { office: 'Department', status: 'Pending' }
            ]
          }
        ];
        return [];
      }),
      save: vi.fn()
    };
    (clearanceService as any).officeRequestsInFlight = new Map();
    (clearanceService as any).myRequestInFlight$ = null;
    (clearanceService as any).clearanceOffices = ['Games Coach', 'Hall Warden', 'USAB', 'DARUSO', 'Library', 'Dean of Students', 'Smart Card'];

    notificationService = Object.create(NotificationService.prototype);
    (notificationService as any).http = mockHttp;
    (notificationService as any).config = mockConfig;
    (notificationService as any).storage = {
      get: vi.fn(() => 'mock-jwt-token')
    };
    (notificationService as any).notificationsSubject = {
      value: [],
      next: vi.fn(),
      asObservable: vi.fn()
    };
    (notificationService as any).unreadCountSubject = {
      value: 0,
      next: vi.fn(),
      asObservable: vi.fn()
    };
    (notificationService as any).refreshUnreadInFlight$ = null;
    (notificationService as any).notificationsInFlight$ = null;
  });

  it('Criterion 1: getStudentRequests is side-effect-free and does NOT trigger HTTP calls', () => {
    const requests = clearanceService.getStudentRequests('std-1');
    expect(requests.length).toBe(1);
    expect(requests[0].id).toBe('req-1');
    // Critical: zero HTTP requests fired from synchronous getter
    expect(mockHttp.get).not.toHaveBeenCalled();
  });

  it('Criterion 2: getRequestsForOffice is side-effect-free and does NOT trigger HTTP calls', () => {
    const requests = clearanceService.getRequestsForOffice('Library');
    expect(requests.length).toBe(1);
    expect(requests[0].id).toBe('req-1');
    // Critical: zero HTTP requests fired from synchronous getter
    expect(mockHttp.get).not.toHaveBeenCalled();
  });

  it('Criterion 3: Concurrent calls to fetchMyRequest share the same in-flight HTTP request', () => {
    const httpSubject = new Subject<any>();
    mockHttp.get.mockReturnValue(httpSubject.asObservable());

    let result1: any = null;
    let result2: any = null;

    // Two simultaneous callers (e.g. Student dashboard + Status component)
    clearanceService.fetchMyRequest().subscribe(res => { result1 = res; });
    clearanceService.fetchMyRequest().subscribe(res => { result2 = res; });

    // Must be called exactly once despite 2 subscriptions
    expect(mockHttp.get).toHaveBeenCalledTimes(1);

    // When backend responds
    httpSubject.next({
      id: 'req-1',
      studentId: 'std-1',
      registrationNumber: '2022-04-01234',
      status: 'IN_PROGRESS',
      approvals: [{ office: 'Library', status: 'PENDING' }]
    });
    httpSubject.complete();

    expect(result1).toBeTruthy();
    expect(result2).toBeTruthy();
    expect(result1.id).toBe('req-1');
    expect(result2.id).toBe('req-1');
  });

  it('Criterion 4: Concurrent calls to fetchOfficeRequests share the same in-flight HTTP request', () => {
    const httpSubject = new Subject<any>();
    mockHttp.get.mockReturnValue(httpSubject.asObservable());

    let result1: any = null;
    let result2: any = null;

    clearanceService.fetchOfficeRequests('Library').subscribe(res => { result1 = res; });
    clearanceService.fetchOfficeRequests('Library').subscribe(res => { result2 = res; });

    // Exactly one HTTP request issued for the in-flight office
    expect(mockHttp.get).toHaveBeenCalledTimes(1);

    httpSubject.next([{
      id: 'req-1',
      studentName: 'Amina',
      status: 'IN_PROGRESS',
      approvals: [{ office: 'Library', status: 'PENDING' }]
    }]);
    httpSubject.complete();

    expect(result1?.length).toBe(1);
    expect(result2?.length).toBe(1);
  });

  it('Criterion 5: Concurrent calls to refreshUnreadCount share the same in-flight HTTP request', () => {
    const httpSubject = new Subject<any>();
    mockHttp.get.mockReturnValue(httpSubject.asObservable());

    let count1: number | null = null;
    let count2: number | null = null;

    notificationService.refreshUnreadCount().subscribe(c => { count1 = c; });
    notificationService.refreshUnreadCount().subscribe(c => { count2 = c; });

    // Exactly one HTTP request issued
    expect(mockHttp.get).toHaveBeenCalledTimes(1);

    httpSubject.next({ unreadCount: 3 });
    httpSubject.complete();

    expect(count1).toBe(3);
    expect(count2).toBe(3);
  });
});
