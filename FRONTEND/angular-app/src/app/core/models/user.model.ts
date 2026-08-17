export type UserRole =
  | 'Student'
  | 'Library'
  | 'Department'
  | 'Finance'
  | 'ICT'
  | 'Academic Staff'
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
  programme: string;
  department: string;
  college: string;
  yearOfStudy: number;
  status: UserStatus;
  createdAt: string;
}
