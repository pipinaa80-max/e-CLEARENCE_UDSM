import '@angular/compiler';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { CertificateService } from './certificate.service';

describe('CertificateService API Integration', () => {
  let service: CertificateService;
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
      getToken: vi.fn().mockReturnValue('valid-jwt-token')
    };

    service = Object.create(CertificateService.prototype);
    (service as any).http = mockHttp;
    (service as any).config = mockConfig;
    (service as any).authService = mockAuth;
    (service as any).triggerFileDownload = vi.fn();
  });

  it('downloads student own certificate from GET /api/v1/clearance/my-certificate with Bearer token', () => {
    const dummyBlob = new Blob(['%PDF-1.4 mock pdf data'], { type: 'application/pdf' });
    mockHttp.get.mockReturnValue(of(dummyBlob));

    service.downloadMyCertificate().subscribe(blob => {
      expect(blob).toBe(dummyBlob);
    });

    expect(mockHttp.get).toHaveBeenCalledTimes(1);
    const [url, options] = mockHttp.get.mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/v1/clearance/my-certificate');
    expect(options.responseType).toBe('blob');
    expect(options.headers.get('Authorization')).toBe('Bearer valid-jwt-token');
    expect((service as any).triggerFileDownload).toHaveBeenCalledWith(dummyBlob, 'UDSM_Clearance_Certificate.pdf');
  });

  it('downloads specific request certificate from GET /api/v1/clearance/certificate/:requestId', () => {
    const dummyBlob = new Blob(['%PDF-1.4 mock pdf data'], { type: 'application/pdf' });
    mockHttp.get.mockReturnValue(of(dummyBlob));

    service.downloadCertificate('req-501').subscribe(blob => {
      expect(blob).toBe(dummyBlob);
    });

    expect(mockHttp.get).toHaveBeenCalledTimes(1);
    const [url, options] = mockHttp.get.mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/v1/clearance/certificate/req-501');
    expect(options.responseType).toBe('blob');
    expect(options.headers.get('Authorization')).toBe('Bearer valid-jwt-token');
    expect((service as any).triggerFileDownload).toHaveBeenCalledWith(dummyBlob, 'UDSM_Clearance_Certificate_req-501.pdf');
  });

  it('verifies valid public certificate via GET /api/v1/clearance/certificate/verify/:code', () => {
    const verifyResponse = {
      valid: true,
      certificateNumber: 'UDSM-CLR-2026-ABCD1234EFGH5678',
      status: 'VALID',
      student: {
        fullName: 'Juma Selemani',
        registrationNumber: '2022-04-09999',
        programme: 'BSc. Computer Science',
        college: 'CoICT'
      }
    };
    mockHttp.get.mockReturnValue(of(verifyResponse));

    service.verifyCertificate('valid-code-123').subscribe(res => {
      expect(res.valid).toBe(true);
      expect(res.certificateNumber).toBe('UDSM-CLR-2026-ABCD1234EFGH5678');
      expect(res.student?.fullName).toBe('Juma Selemani');
    });

    expect(mockHttp.get).toHaveBeenCalledTimes(1);
    const [url] = mockHttp.get.mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/v1/clearance/certificate/verify/valid-code-123');
  });

  it('handles invalid or revoked certificate safely without crashing', () => {
    mockHttp.get.mockReturnValue(throwError(() => ({
      error: { message: 'Certificate has been revoked due to disciplinary hold.' }
    })));

    service.verifyCertificate('revoked-code-xyz').subscribe(res => {
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Certificate has been revoked due to disciplinary hold.');
    });

    expect(mockHttp.get).toHaveBeenCalledTimes(1);
  });
});
