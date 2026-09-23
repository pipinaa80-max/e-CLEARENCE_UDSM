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

describe('Transcript Payment - Request More Copies Verification', () => {
  let paymentService: TranscriptPaymentService;

  beforeEach(() => {
    (globalThis as any).localStorage = createLocalStorageMock();
    paymentService = new TranscriptPaymentService();
  });

  it('should allow starting a new request even when previous request is in Receipt Submitted state', () => {
    // Student creates request #1 and #2 and submits receipt
    const req1 = paymentService.createRequest({
      studentId: 'usr-999',
      studentName: 'Sarafina Maganga',
      registrationNumber: '2025-04-05009',
      award: 'Bachelor Degree',
      graduationYear: '2026',
      transcriptCount: 1
    });

    paymentService.issueControlNumber(req1.id, 'CN-111');
    paymentService.submitReceipt(req1.id, 'REC1.jpeg', 'data:image/jpeg;base64,mock');

    const allBefore = paymentService.getStudentRequests('usr-999');
    expect(allBefore.length).toBe(1);
    expect(allBefore[0].status).toBe('Receipt Submitted');

    // Student clicks "Request More Copies"
    const req2 = paymentService.createRequest({
      studentId: 'usr-999',
      studentName: 'Sarafina Maganga',
      registrationNumber: '2025-04-05009',
      award: 'Bachelor Degree',
      graduationYear: '2026',
      transcriptCount: 2
    });

    expect(req2.attemptNumber).toBe(2);
    expect(req2.transcriptCount).toBe(2);
    expect(req2.amount).toBe(10000); // 2 copies * 5,000

    const allAfter = paymentService.getStudentRequests('usr-999');
    expect(allAfter.length).toBe(2);
  });
});
