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
  | 'Finance';

export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

export interface OfficeApproval {
  office: ClearanceOffice;
  status: ApprovalStatus;
  comment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface ClearanceRequest {
  id: string;
  studentId: string;
  college: string;
  department: string;
  programme: string;
  requestDate: string;
  status: 'Pending' | 'Completed' | 'Rejected';
  currentOffice?: ClearanceOffice;
  currentStage:
    | 'Convocation'
    | 'Parallel'
    | 'Department'
    | 'Principal'
    | 'Finance'
    | 'Completed';
  approvals: OfficeApproval[];
}