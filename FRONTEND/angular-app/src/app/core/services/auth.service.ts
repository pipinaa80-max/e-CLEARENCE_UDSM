import { Injectable } from '@angular/core';

import { User, UserRole } from '../models/user.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storage = new StorageService();
  private readonly currentUserKey = 'udsm-current-user';
  private readonly usersKey = 'udsm-users';

  register(user: Omit<User, 'id' | 'createdAt'> & { password: string }): User {
    const users = this.getAllUsers();
    const duplicateEmail = users.some((item) => item.email.toLowerCase() === user.email.toLowerCase());
    const duplicateRegistrationNumber = users.some(
      (item) => item.registrationNumber.toLowerCase() === user.registrationNumber.toLowerCase()
    );

    if (duplicateEmail) {
      throw new Error('A user with this email already exists.');
    }

    if (duplicateRegistrationNumber) {
      throw new Error('A user with this registration number already exists.');
    }

    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'Active'
    };

    users.push(newUser);
    this.storage.save(this.usersKey, users);
    return newUser;
  }

  login(identifier: string, password: string, role: UserRole): User | null {
    const users = this.getAllUsers();
    const match = users.find(
      (user) =>
        user.status === 'Active' &&
        user.role === role &&
        (user.email.toLowerCase() === identifier.toLowerCase() ||
          user.registrationNumber.toLowerCase() === identifier.toLowerCase()) &&
        user.password === password
    );

    if (!match) {
      return null;
    }

    this.storage.save(this.currentUserKey, match);
    return match;
  }

  logout(): void {
    this.storage.remove(this.currentUserKey);
  }

  getCurrentUser(): User | null {
    return this.storage.get<User>(this.currentUserKey);
  }

  updateCurrentUser(user: User): void {
    const users = this.getAllUsers().map((item) => (item.id === user.id ? user : item));
    this.storage.save(this.usersKey, users);
    this.storage.save(this.currentUserKey, user);
  }

  isLoggedIn(): boolean {
    return !!this.getCurrentUser();
  }

  getAllUsers(): User[] {
    return this.storage.get<User[]>(this.usersKey) ?? this.seedDemoUsers();
  }

  private seedDemoUsers(): User[] {
    const demoUsers: User[] = [
      {
        id: crypto.randomUUID(),
        fullName: 'Demo Student',
        registrationNumber: 'DEMO-001',
        email: 'student@example.com',
        phone: '+255712345678',
        password: 'Student123!',
        role: 'Student',
        programme: 'Computer Science',
        department: 'Computer Science',
        college: 'CoICT',
        yearOfStudy: 3,
        status: 'Active',
        createdAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        fullName: 'Library Officer',
        registrationNumber: 'LIB-001',
        email: 'library@example.com',
        phone: '+255712345679',
        password: 'Library123!',
        role: 'Library',
        programme: '',
        department: 'Library Services',
        college: 'Main Campus',
        yearOfStudy: 0,
        status: 'Active',
        createdAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        fullName: 'Finance Officer',
        registrationNumber: 'FIN-001',
        email: 'finance@example.com',
        phone: '+255712345680',
        password: 'Finance123!',
        role: 'Finance',
        programme: '',
        department: 'Finance Office',
        college: 'Administration',
        yearOfStudy: 0,
        status: 'Active',
        createdAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        fullName: 'ICT Officer',
        registrationNumber: 'ICT-001',
        email: 'ict@example.com',
        phone: '+255712345681',
        password: 'Ict123!',
        role: 'ICT',
        programme: '',
        department: 'ICT Support',
        college: 'IT Services',
        yearOfStudy: 0,
        status: 'Active',
        createdAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        fullName: 'Academic Officer',
        registrationNumber: 'ACA-001',
        email: 'academic@example.com',
        phone: '+255712345682',
        password: 'Academic123!',
        role: 'Academic Staff',
        programme: '',
        department: 'Academic Registry',
        college: 'Academics',
        yearOfStudy: 0,
        status: 'Active',
        createdAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        fullName: 'System Administrator',
        registrationNumber: 'ADM-001',
        email: 'admin@example.com',
        phone: '+255712345683',
        password: 'Admin123!',
        role: 'Administrator',
        programme: '',
        department: 'Administration',
        college: 'Administration',
        yearOfStudy: 0,
        status: 'Active',
        createdAt: new Date().toISOString()
      }
    ];

    this.storage.save(this.usersKey, demoUsers);
    return demoUsers;
  }
}
