import '@angular/compiler';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { DocumentService, DocumentUploadRequest } from './document.service';

describe('DocumentService API Integration', () => {
  let service: DocumentService;
  let mockHttp: any;
  let mockConfig: any;
  let mockAuth: any;

  beforeEach(() => {
    mockHttp = {
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    };
    mockConfig = {
      apiUrl: 'http://localhost:8080/api/v1'
    };
    mockAuth = {
      getToken: vi.fn().mockReturnValue('mock-jwt-token')
    };

    service = new DocumentService(mockHttp, mockConfig, mockAuth);
  });

  it('uploads a document with multipart form data to POST /api/v1/documents/upload', () => {
    const uploadData: DocumentUploadRequest = {
      studentId: 'std-123',
      fileName: 'clearance_receipt.pdf',
      fileType: 'application/pdf',
      fileSize: 1024
    };
    const mockFile = new File(['%PDF-1.4 test'], 'clearance_receipt.pdf', { type: 'application/pdf' });

    const mockResponse = {
      success: true,
      message: 'Uploaded',
      data: {
        id: 'doc-uuid-1',
        fileName: 'clearance_receipt.pdf',
        fileType: 'application/pdf',
        fileUrl: '/api/v1/documents/doc-uuid-1/download',
        fileSize: 1024,
        uploadDate: '2026-11-12T08:00:00Z',
        category: 'Clearance Supporting Document',
        verified: false,
        studentId: 'std-123',
        studentName: 'Amina Juma'
      }
    };

    mockHttp.post.mockReturnValue(of(mockResponse));

    service.uploadDocument(uploadData, mockFile).subscribe(res => {
      expect(res.id).toBe('doc-uuid-1');
      expect(res.fileName).toBe('clearance_receipt.pdf');
      expect(res.fileUrl).toBe('/api/v1/documents/doc-uuid-1/download');
    });

    expect(mockHttp.post).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/documents/upload',
      expect.any(FormData),
      expect.objectContaining({
        headers: expect.anything()
      })
    );
  });

  it('fetches paginated student documents from GET /api/v1/documents/student/:studentId', () => {
    const mockPage = {
      content: [{ id: 'doc-1', fileName: 'id.pdf', verified: true }],
      totalElements: 1,
      totalPages: 1,
      size: 10,
      number: 0
    };
    mockHttp.get.mockReturnValue(of(mockPage));

    service.getStudentDocuments('std-123', 0, 10).subscribe(res => {
      expect(res.totalElements).toBe(1);
      expect(res.content[0].id).toBe('doc-1');
    });

    expect(mockHttp.get).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/documents/student/std-123',
      expect.objectContaining({
        params: expect.anything()
      })
    );
  });

  it('staff verifies a document via PUT /api/v1/documents/verify/:id with officer and comment query params', () => {
    mockHttp.put.mockReturnValue(of({ success: true, message: 'Document verified' }));

    service.verifyDocument('doc-1', 'officer-99', true, 'Valid bank stamp').subscribe(res => {
      expect(res.success).toBe(true);
    });

    expect(mockHttp.put).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/documents/verify/doc-1',
      null,
      expect.objectContaining({
        params: expect.anything()
      })
    );
  });

  it('handles 403 Forbidden when unauthorized user attempts verification', () => {
    mockHttp.put.mockReturnValue(throwError(() => ({ status: 403, error: 'Forbidden' })));

    service.verifyDocument('doc-1', 'student-1', true).subscribe({
      next: () => { throw new Error('Should not succeed'); },
      error: (err) => {
        expect(err.status).toBe(403);
      }
    });
  });

  it('handles 400 Bad Request when attempting to delete a verified document', () => {
    mockHttp.delete.mockReturnValue(throwError(() => ({ status: 400, message: 'Cannot delete a verified document' })));

    service.deleteDocument('doc-1', 'std-123').subscribe({
      next: () => { throw new Error('Should not succeed'); },
      error: (err) => {
        expect(err.status).toBe(400);
      }
    });
  });
});
