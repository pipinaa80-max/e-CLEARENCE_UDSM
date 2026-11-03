export type TranscriptPaymentStatus =
  | 'Pending Control Number'
  | 'Awaiting Payment'
  | 'Receipt Submitted'
  | 'Paid'
  | 'Receipt Rejected';

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
  rejectionReason?: string;
  requestedAt: string;
  controlNumberRequestedAt?: string;
  controlNumberIssuedAt?: string;
  receiptSubmittedAt?: string;
  collectionMethod?: 'Physical Collection' | 'Post by DHL';
  postingAddress?: string;
  postingRegion?: string;
  postingWard?: string;
  postingPoBox?: string;
  postingContactPhone?: string;
  postingContactEmail?: string;
  dispatchStatus?: 'Pending Dispatch' | 'Dispatched' | 'Collected';
  dispatchedAt?: string;
  certificateVerified?: boolean;
  certificateVerifiedAt?: string;
  digitalSignature?: string;
  digitalSignatureHash?: string;
  signedBy?: string;
  signedAt?: string;

  // Station Secretary Intake & Handover fields
  stationCode?: string;
  stationName?: string;
  intakeStatus?: 'Awaiting Intake' | 'Received at Station' | 'In Vault' | 'Collected by Student';
  stationReceivedAt?: string;
  stationReceivedBy?: string;
  vaultLockerNumber?: string;
  packageCondition?: string;
  handoverApproved?: boolean;
  handoverApprovedAt?: string;
  handoverSecretary?: string;
  handoverCollectorType?: 'Student in Person' | 'Authorized Legal Representative';
  handoverCollectorName?: string;
  handoverCollectorId?: string;
  handoverCollectorPhone?: string;
  handoverReceiptToken?: string;
  handoverNotes?: string;
  transitIssueNotes?: string;
}
