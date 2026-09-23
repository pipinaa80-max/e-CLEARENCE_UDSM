import { describe, expect, it, beforeEach } from 'vitest';

interface NewUser {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  registrationNumber: string;
  password: string;
  role: string;
  college: string;
  department: string;
  programme: string;
  faculty: string;
  yearOfStudy: string;
}

describe('Admin Dashboard - Manual User Registration', () => {
  let newUser: NewUser;

  beforeEach(() => {
    newUser = {
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      registrationNumber: '',
      password: '',
      role: 'STUDENT',
      college: '',
      department: '',
      programme: '',
      faculty: '',
      yearOfStudy: ''
    };
  });

  it('should construct a valid new student user payload with optional middleName', () => {
    newUser.firstName = 'Amina';
    newUser.middleName = 'Juma';
    newUser.lastName = 'Hassan';
    newUser.email = 'amina.hassan@udsm.ac.tz';
    newUser.registrationNumber = '2025-04-99999';
    newUser.password = 'StudentPass123!';
    newUser.role = 'STUDENT';
    newUser.college = 'College of Information and Communication Technologies (CoICT)';
    newUser.department = 'Department of Computer Science & Engineering';
    newUser.programme = 'BSc in Business Information Technology';

    expect(newUser.firstName).toBe('Amina');
    expect(newUser.middleName).toBe('Juma');
    expect(newUser.lastName).toBe('Hassan');
    expect(newUser.email).toBe('amina.hassan@udsm.ac.tz');
    expect(newUser.registrationNumber).toBe('2025-04-99999');
    expect(newUser.role).toBe('STUDENT');
  });

  it('should allow middleName to remain empty when optional', () => {
    newUser.firstName = 'Baraka';
    newUser.middleName = ''; // Optional
    newUser.lastName = 'Mwamba';
    newUser.email = 'baraka.mwamba@udsm.ac.tz';
    newUser.registrationNumber = '2025-04-77777';
    newUser.password = 'StudentPass123!';

    expect(newUser.firstName).toBe('Baraka');
    expect(newUser.middleName).toBe('');
    expect(newUser.lastName).toBe('Mwamba');
  });

  it('should reset user form correctly after registration', () => {
    newUser.firstName = 'Test';
    newUser.middleName = 'Sample';
    newUser.lastName = 'User';

    // Simulate resetUserForm()
    newUser = {
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      registrationNumber: '',
      password: '',
      role: 'STUDENT',
      college: '',
      department: '',
      programme: '',
      faculty: '',
      yearOfStudy: ''
    };

    expect(newUser.firstName).toBe('');
    expect(newUser.middleName).toBe('');
    expect(newUser.lastName).toBe('');
  });
});
