export interface DashboardStat {
  label: string;
  value: number;
  tone?: 'success' | 'warning' | 'danger' | 'info';
}

export interface OfficeProgress {
  name: string;
  description: string;
  status: 'Not Started' | 'Pending' | 'Approved' | 'Rejected';
  date?: string;
  comment?: string;
}
