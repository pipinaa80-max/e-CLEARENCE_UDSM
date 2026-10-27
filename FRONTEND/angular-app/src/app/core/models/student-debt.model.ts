export interface StudentDebtFlag {
  id: string;
  studentId: string;
  registrationNumber: string;
  studentName: string;
  college: string;
  department: string;
  programme?: string;
  amount: number;
  reason: string;
  negotiationNotes?: string;
  status: 'OPEN' | 'RESOLVED';
  lecturerName: string;
  resolutionNote?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface StudentClearanceLookup {
  registrationNumber: string;
  studentName: string;
  college: string;
  department: string;
  clearanceStatus: string;
  currentStage?: string;
  cleared: boolean;
}

