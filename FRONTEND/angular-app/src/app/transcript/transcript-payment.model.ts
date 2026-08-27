export type TranscriptPaymentStatus =
  | 'Pending Control Number'
  | 'Awaiting Payment'
  | 'Receipt Submitted'
  | 'Paid';

export interface TranscriptPaymentRequest {
  id: string;
  studentId: string;
  studentName: string;
  registrationNumber: string;
  award: string;
  graduationYear: string;
  transcriptCount: number;
  amount: number;
  currency: 'TZS';
  attemptNumber: number;
  status: TranscriptPaymentStatus;
  controlNumber?: string;
  receiptFileName?: string;
  receiptData?: string;
  requestedAt: string;
  controlNumberRequestedAt?: string;
  controlNumberIssuedAt?: string;
  receiptSubmittedAt?: string;
}