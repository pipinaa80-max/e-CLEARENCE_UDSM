// models/clearance.model.ts

export type ClearanceOffice =
    | 'Convocation'
    | 'Games Coach'
    | 'Hall Warden'
    | 'USAB'
    | 'DARUSO'
    | 'Library'
    | 'Dean of Students'
    | 'Smart Card'
    | 'Department'
    | 'Principal'
    | 'Finance'
    | 'Workshop'
    | 'Laboratory'
    | 'Parallel'
    | 'Supervisor';

export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

export interface OfficeApproval {
  office: ClearanceOffice;
  status: ApprovalStatus;
  comment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewerEmail?: string;
  reviewerPhone?: string;
}

export interface ClearanceRejectionRecord {
  office: ClearanceOffice;
  reason: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface ConvocationPayment {
  controlNumber?: string;
  submittedControlNumber?: string;
  controlNumberRequestedAt?: string;
  controlNumberIssuedAt?: string;
  receiptFileName?: string;
  receiptData?: string;
  receiptSubmittedAt?: string;
}

export interface FinanceReceiptSubmission {
  receiptFileName?: string;
  receiptData?: string;
  receiptStorageId?: string;
  receiptMimeType?: string;
  receiptSubmittedAt?: string;
  receiptNote?: string;
  controlNumber?: string;
}

export interface ClearanceRequest {
  id: string;
  studentId: string;
  studentName?: string;           // Added
  registrationNumber?: string;    // Added
  email?: string;
  phoneNumber?: string;
  physicalAddress?: string;
  address?: string;
  college: string;
  department: string;
  programme: string;
  hall?: string;                  // Added
  wing?: string;
  block?: string;
  roomNumber?: string;            // Added
  residenceType?: 'Hostel Dwellers' | 'Non-Hostel Dwellers' | 'Off Campus';
  residenceEvidence?: string;
  sponsor?: string;               // Added
  photo?: string;                 // Added
  clearanceType?: string;         // Added
  remarks?: string;               // Added
  award?: string;
  isPostgraduate?: boolean;
  undergraduateCertificateUrl?: string;
  requestDate: string;
  status: 'Pending' | 'Completed' | 'Rejected';
  currentOffice?: ClearanceOffice;
  revisionOffice?: ClearanceOffice;
  currentStage: 'Convocation' | 'Parallel' | 'Department' | 'Principal' | 'Finance' | 'Supervisor' | 'Completed';
  convocation?: ConvocationPayment;
  financeReceipt?: FinanceReceiptSubmission;
  resubmittedWithReceipt?: boolean;
  approvals: OfficeApproval[];
  rejectionHistory?: ClearanceRejectionRecord[];
}
