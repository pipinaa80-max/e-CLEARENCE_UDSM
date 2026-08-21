export type DocumentStatus = 'Pending' | 'Approved' | 'Rejected';

export interface DocumentItem {
  id: string;
  studentId: string;
  clearanceId?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  status: DocumentStatus;
  uploadedAt: string;
  verifiedAt?: string;
  comment?: string;
}
