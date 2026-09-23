import { describe, expect, it, beforeEach } from 'vitest';
import { TranscriptPaymentService } from '../core/services/transcript-payment.service';
import { TranscriptPaymentRequest } from './transcript-payment.model';

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
};

describe('Transcript Payment - Receipt Submission Fix Verification', () => {
  let paymentService: TranscriptPaymentService;

  beforeEach(() => {
    (globalThis as any).localStorage = createLocalStorageMock();
    paymentService = new TranscriptPaymentService();
  });

  it('should successfully submit receipt and transition status to Receipt Submitted', () => {
    // Create new request
    const req = paymentService.createRequest({
      studentId: 'student-123',
      studentName: 'Sarafina Maganga',
      registrationNumber: '2025-04-99999',
      award: 'Bachelor Degree',
      graduationYear: '2026',
      transcriptCount: 1
    });

    expect(req.status).toBe('Pending Control Number');

    // Issue control number
    paymentService.issueControlNumber(req.id, '1234567890');
    const updatedReq = paymentService.getStudentRequests('student-123').find(r => r.id === req.id);
    expect(updatedReq?.status).toBe('Awaiting Payment');

    // Submit receipt photo
    const submitted = paymentService.submitReceipt(req.id, 'STUDENT_ID.jpeg', 'data:image/jpeg;base64,mockimagedata');
    expect(submitted).toBe(true);

    const finalReq = paymentService.getStudentRequests('student-123').find(r => r.id === req.id);
    expect(finalReq?.status).toBe('Receipt Submitted');
    expect(finalReq?.receiptFileName).toBe('STUDENT_ID.jpeg');
  });

  it('should allow receipt submission even if status was already transitioning', () => {
    const req = paymentService.createRequest({
      studentId: 'student-456',
      studentName: 'Baraka Mwamba',
      registrationNumber: '2025-04-11111',
      award: 'Bachelor Degree',
      graduationYear: '2026',
      transcriptCount: 1
    });

    // Directly submit receipt
    const submitted = paymentService.submitReceipt(req.id, 'RECEIPT.jpg', 'data:image/jpeg;base64,data');
    expect(submitted).toBe(true);

    const checkReq = paymentService.getStudentRequests('student-456').find(r => r.id === req.id);
    expect(checkReq?.status).toBe('Receipt Submitted');
  });
});
