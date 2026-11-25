import '@angular/compiler';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { ClearanceService } from './clearance.service';

describe('ClearanceService API Integration', () => {
  let service: ClearanceService;
  let mockHttp: any;
  let mockConfig: any;

  beforeEach(() => {
    mockHttp = {
      post: vi.fn(),
      get: vi.fn()
    };
    mockConfig = {
      apiUrl: 'http://localhost:8080/api/v1'
    };

    service = Object.create(ClearanceService.prototype);
    (service as any).http = mockHttp;
    (service as any).config = mockConfig;
    (service as any).storage = {
      get: vi.fn((key: string) => {
        if (key === 'udsm-auth-token') return 'mock-jwt-token';
        return [];
      }),
      save: vi.fn()
    };
    (service as any).lastOfficeFetchTime = {};
    (service as any).lastStudentFetchTime = {};
    (service as any).officeRequestsInFlight = new Map();
    (service as any).myRequestInFlight$ = null;
    (service as any).clearanceOffices = ['Games Coach', 'Hall Warden', 'USAB', 'DARUSO', 'Library', 'Dean of Students', 'Smart Card'];
  });

  it('submits a new student clearance request to POST /api/v1/clearance/request with confirm flag', () => {
    const payload = {
      studentId: 'std-1',
      studentName: 'Amina Juma',
      registrationNumber: '2022-04-01234',
      college: 'CoICT',
      department: 'CSE',
      programme: 'BSc CS',
      email: 'amina@udsm.ac.tz',
      phoneNumber: '0712345678',
      academicYear: '2025/2026',
      hall: 'Hall 5'
    };

    mockHttp.post.mockReturnValue(of({ success: true, requestId: 'req-101' }));

    service.submitBackendRequest(payload).subscribe(res => {
      expect(res.success).toBe(true);
      expect(res.requestId).toBe('req-101');
    });

    expect(mockHttp.post).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/clearance/request',
      { ...payload, confirm: true },
      expect.anything()
    );
  });

  it('fetches office review requests from GET /api/v1/clearance/office/requests with query parameters', () => {
    const mockRequests = [{
      id: 'req-1',
      studentName: 'Amina Juma',
      registrationNumber: '2022-04-01234',
      status: 'IN_PROGRESS',
      approvals: [{ office: 'Library', status: 'PENDING' }]
    }];

    mockHttp.get.mockReturnValue(of(mockRequests));

    service.fetchOfficeRequests('Library', 'PENDING').subscribe(res => {
      expect(res.length).toBe(1);
      expect(res[0].id).toBe('req-1');
    });

    expect(mockHttp.get).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/clearance/office/requests?office=Library&status=PENDING',
      expect.anything()
    );
  });

  it('approves an office clearance stage via POST /api/v1/clearance/office/approve', () => {
    mockHttp.post.mockReturnValue(of({ success: true, message: 'Office approved' }));

    service.approveOfficeBackend('req-1', 'Library', 'Books returned in good order').subscribe(res => {
      expect(res.success).toBe(true);
    });

    expect(mockHttp.post).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/clearance/office/approve',
      {
        requestId: 'req-1',
        office: 'Library',
        comments: 'Books returned in good order'
      },
      expect.anything()
    );
  });

  it('rejects an office clearance stage via POST /api/v1/clearance/office/reject', () => {
    mockHttp.post.mockReturnValue(of({ success: true, message: 'Office rejected' }));

    service.rejectOfficeBackend('req-1', 'Library', 'Missing textbook').subscribe(res => {
      expect(res.success).toBe(true);
    });

    expect(mockHttp.post).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/clearance/office/reject',
      {
        requestId: 'req-1',
        office: 'Library',
        reason: 'Missing textbook'
      },
      expect.anything()
    );
  });

  it('withdraws an office approval decision via POST /api/v1/clearance/office/withdraw', () => {
    mockHttp.post.mockReturnValue(of({ success: true, message: 'Office approval withdrawn' }));

    service.withdrawOfficeBackend('req-1', 'Library').subscribe(res => {
      expect(res.success).toBe(true);
    });

    expect(mockHttp.post).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/clearance/office/withdraw',
      {
        requestId: 'req-1',
        office: 'Library'
      },
      expect.anything()
    );
  });
});
