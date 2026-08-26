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
  | 'ICT'
  | 'Academic Staff'
  | 'Workshop'
  | 'Laboratory'
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
  yearOfStudy: number;
  status: UserStatus;
  createdAt: string;
}
