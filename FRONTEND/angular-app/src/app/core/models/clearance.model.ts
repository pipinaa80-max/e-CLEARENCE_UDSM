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
    | 'Laboratory';

export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

export interface OfficeApproval {
  office: ClearanceOffice;
  status: ApprovalStatus;
  comment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface ConvocationPayment {
  controlNumber?: string;
  controlNumberRequestedAt?: string;
  controlNumberIssuedAt?: string;
  receiptFileName?: string;
  receiptSubmittedAt?: string;
}

export interface ClearanceRequest {
  id: string;
  studentId: string;
  studentName?: string;           // Added
  registrationNumber?: string;    // Added
  college: string;
  department: string;
  programme: string;
  hall?: string;                  // Added
  roomNumber?: string;            // Added
  residenceType?: 'Off Campus' | 'Hostel Dwellers';
  residenceEvidence?: string;
  sponsor?: string;               // Added
  photo?: string;                 // Added
  clearanceType?: string;         // Added
  remarks?: string;               // Added
  requestDate: string;
  status: 'Pending' | 'Completed' | 'Rejected';
  currentOffice?: ClearanceOffice;
  revisionOffice?: ClearanceOffice;
  currentStage: 'Convocation' | 'Parallel' | 'Department' | 'Principal' | 'Finance' | 'Completed';
  convocation?: ConvocationPayment;
  approvals: OfficeApproval[];
}