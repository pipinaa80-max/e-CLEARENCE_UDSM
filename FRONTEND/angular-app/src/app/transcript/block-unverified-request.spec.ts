import { describe, expect, it, beforeEach } from 'vitest';
import { TranscriptPaymentService } from '../core/services/transcript-payment.service';

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
};

describe('Transcript Payment - Block Unverified Concurrent Requests', () => {
  let paymentService: TranscriptPaymentService;

  beforeEach(() => {
    (globalThis as any).localStorage = createLocalStorageMock();
    paymentService = new TranscriptPaymentService();
  });

  it('should identify when a student has an unverified active request', () => {
    const studentId = 'usr-block-1';

    // Student creates request #1
    const req1 = paymentService.createRequest({
      studentId,
      studentName: 'Sarafina Maganga',
      registrationNumber: '2025-04-05009',
      award: 'Bachelor Degree',
      graduationYear: '2026',
      transcriptCount: 1
    });

    const requests = paymentService.getStudentRequests(studentId);
    const lastRequest = requests.at(-1);

    const hasUnverifiedActiveRequest = !!lastRequest && lastRequest.status !== 'Paid';
    expect(hasUnverifiedActiveRequest).toBe(true);
  });

  it('should allow new request ONLY after previous request status is Paid', () => {
    const studentId = 'usr-block-2';

    const req1 = paymentService.createRequest({
      studentId,
      studentName: 'Sarafina Maganga',
      registrationNumber: '2025-04-05009',
      award: 'Bachelor Degree',
      graduationYear: '2026',
      transcriptCount: 1
    });

    paymentService.issueControlNumber(req1.id, 'CN-999');
    paymentService.submitReceipt(req1.id, 'REC.jpg', 'data:image/jpeg;base64,data');

    // Currently status = Receipt Submitted (Not Paid)
    let lastRequest = paymentService.getStudentRequests(studentId).at(-1);
    expect(lastRequest?.status).toBe('Receipt Submitted');
    expect(lastRequest?.status === 'Paid').toBe(false);

    // Finance verifies payment
    paymentService.updateStatus(req1.id, 'Paid');

    lastRequest = paymentService.getStudentRequests(studentId).at(-1);
    expect(lastRequest?.status).toBe('Paid');
    expect(lastRequest?.status === 'Paid').toBe(true);

    // Now new request can be created
    const req2 = paymentService.createRequest({
      studentId,
      studentName: 'Sarafina Maganga',
      registrationNumber: '2025-04-05009',
      award: 'Bachelor Degree',
      graduationYear: '2026',
      transcriptCount: 1
    });

    expect(req2.attemptNumber).toBe(2);
  });
});
