import { describe, expect, it } from 'vitest';
import { sortTranscriptRequestsForFinance } from './finance-payment.utils';
import type { TranscriptPaymentRequest } from './transcript-payment.model';

describe('sortTranscriptRequestsForFinance', () => {
  it('should sort safely even when requestedAt is missing', () => {
    const requests = [
      {
        id: 'missing-date',
        status: 'Pending Control Number',
        studentName: 'Student A',
        amount: 15000,
        requestedAt: undefined
      },
      {
        id: 'older',
        status: 'Pending Control Number',
        studentName: 'Student B',
        amount: 15000,
        requestedAt: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 'newer',
        status: 'Pending Control Number',
        studentName: 'Student C',
        amount: 15000,
        requestedAt: '2024-03-01T00:00:00.000Z'
      }
    ] as unknown as TranscriptPaymentRequest[];

    const sorted = sortTranscriptRequestsForFinance(requests as TranscriptPaymentRequest[]);

    expect(() => sortTranscriptRequestsForFinance(requests as TranscriptPaymentRequest[])).not.toThrow();
    expect(sorted.map((request: TranscriptPaymentRequest) => request.id)).toEqual(['newer', 'older', 'missing-date']);
  });
});
