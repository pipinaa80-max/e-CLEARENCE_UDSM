export type ClearanceType =
  | 'Graduation Clearance'
  | 'Withdrawal Clearance'
  | 'Transfer Clearance'
  | 'General Clearance';

export type ClearanceStatus =
  | 'Not Requested'
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Completed'
  | 'Cancelled';

export interface ClearanceRequest {
  id: string;
  studentId: string;
  college?: string;
  department?: string;
  programme?: string;
  clearanceType: ClearanceType;
  requestDate: string;
  status: ClearanceStatus;
  completionDate?: string;
  currentOffice: string;
  remarks?: string;
}

export interface ClearanceApproval {
  id: string;
  clearanceId: string;
  officeId: string;
  officerId: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  comment: string;
  date: string;
}
