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

describe('Transcript Payment - Compressed Image Receipt Submission', () => {
  let paymentService: TranscriptPaymentService;

  beforeEach(() => {
    (globalThis as any).localStorage = createLocalStorageMock();
    paymentService = new TranscriptPaymentService();
  });

  it('should save compressed image data without losing receipt photo', () => {
    const req = paymentService.createRequest({
      studentId: 'student-789',
      studentName: 'Maganga Sarafina Shija',
      registrationNumber: '2025-04-05009',
      award: 'Bachelor Degree',
      graduationYear: '2026',
      transcriptCount: 1
    });

    const compressedImageData = 'data:image/jpeg;base64,compressed30kbDataHere';
    const submitted = paymentService.submitReceipt(req.id, 'STUDENT_ID.jpeg', compressedImageData);

    expect(submitted).toBe(true);

    const savedReq = paymentService.getStudentRequests('student-789').find(r => r.id === req.id);
    expect(savedReq?.receiptData).toBe(compressedImageData);
    expect(savedReq?.receiptFileName).toBe('STUDENT_ID.jpeg');
    expect(savedReq?.status).toBe('Receipt Submitted');
  });
});
