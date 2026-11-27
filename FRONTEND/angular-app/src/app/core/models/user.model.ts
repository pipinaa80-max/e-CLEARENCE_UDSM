export type UserRole =
  | 'Student'
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
  | 'Academic Staff'
  | 'Lecturer'
  | 'Director of Undergraduate Studies'
  | 'Director of Postgraduate Studies'
  | 'DUS Examination Office'
  | 'DUS Secretary'
  | 'Station Secretary'
  | 'Workshop'
  | 'Laboratory'
  | 'Supervisor'
  | 'Administrator';

export type UserStatus = 'Active' | 'Inactive' | 'Suspended';

export interface User {
  id: string;
  fullName: string;
  registrationNumber: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  laboratory?: string;
  programme: string;
  department: string;
  college: string;
  stationCode?: string;
  stationName?: string;
  award?: string;
  isPostgraduate?: boolean;
  undergraduateCertificateUrl?: string;
  yearOfStudy: number;
  status: UserStatus;
  createdAt: string;
}
