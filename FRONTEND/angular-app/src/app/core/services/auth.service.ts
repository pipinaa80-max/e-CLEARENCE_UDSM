import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, tap, throwError } from 'rxjs';
import { User, UserRole } from '../models/user.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = new StorageService();

  private readonly apiUrl = 'http://localhost:8080/api/v1/auth';

  private readonly currentUserKey = 'udsm-current-user';
  private readonly tokenKey = 'udsm-auth-token';
  private readonly usersKey = 'udsm-local-users';

  register(user: any): Observable<any> {
    const users = this.getLocalUsers();
    const duplicate = users.some((saved) => saved.email === user.email || saved.registrationNumber === user.registrationNumber);
    if (duplicate) {
      return throwError(() => ({ status: 409, error: { message: 'An account with this email or registration number already exists.' } }));
    }
    const localUser = {
      id: crypto.randomUUID(),
      fullName: [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' '),
      registrationNumber: user.registrationNumber,
      email: user.email,
      phone: user.phone,
      password: user.password,
      role: this.mapRole({ role: user.role ?? 'STUDENT' }),
      college: 'Not selected',
      department: 'Not selected',
      programme: 'Not selected',
      yearOfStudy: 0,
      status: 'Active',
      createdAt: new Date().toISOString()
    };
    this.storage.save(this.usersKey, [...users, localUser]);
    return of({ message: 'Registration successful.' });
  }

  login(identifier: string, password: string): Observable<any> {
    const user = this.getLocalUsers().find((saved) =>
      (saved.email.toLowerCase() === identifier.toLowerCase() || saved.registrationNumber.toLowerCase() === identifier.toLowerCase()) &&
      saved.password === password
    );
    if (!user) {
      return throwError(() => ({ status: 401, error: { message: 'Login failed. Please check your credentials.' } }));
    }
    this.storage.save(this.currentUserKey, user);
    this.storage.save(this.tokenKey, `local-${user.id}`);
    return of(user);
  }

  private mapUserResponse(response: any): any {
    // Convert snake_case from backend to camelCase for frontend
    const user = {
      ...response,
      id: response.user_id || response.id,
      fullName: response.full_name || response.fullName,
      registrationNumber: response.registration_number || response.registrationNumber,
      phoneNumber: response.phone_number || response.phoneNumber || response.phone,
      isActive: response.is_active !== undefined ? response.is_active : response.isActive,
      lastLogin: response.last_login || response.lastLogin,
      createdAt: response.created_at || response.createdAt,
      updatedAt: response.updated_at || response.updatedAt,
      clearanceStatus: response.clearance_status || response.clearanceStatus,
      isFinalYear: response.is_final_year !== undefined ? response.is_final_year : response.isFinalYear
    };

    // Map role
    if (user.role) {
      user.role = this.mapRole(user);
    }

    return user;
  }

  private mapRole(user: any): UserRole {
    const backendRole = user.role;
    const department = user.department;

    const map: Record<string, UserRole> = {
      'STUDENT': 'Student',
      'CONVOCATION_OFFICER': 'Convocation',
      'GAMES_COACH': 'Games Coach',
      'HALL_WARDEN': 'Hall Warden',
      'USAB_OFFICER': 'USAB',
      'DARUSO_OFFICER': 'DARUSO',
      'LIBRARY_OFFICER': 'Library',
      'DEAN_OF_STUDENTS': 'Dean of Students',
      'SMART_CARD_OFFICER': 'Smart Card',
      'PRINCIPAL': 'Principal',
      'FINANCE_OFFICER': 'Finance',
      'ICT_OFFICER': 'ICT',
      'DEPARTMENT_OFFICER': 'Department',
      'ADMINISTRATOR': 'Administrator',
      'ADMIN': 'Administrator'
    };

    let role = map[backendRole] || (backendRole as UserRole);

    // Distinguish between Department and Academic Staff based on saved department name
    if (backendRole === 'DEPARTMENT_OFFICER' && department === 'Academic Staff') {
      role = 'Academic Staff';
    }

    return role;
  }

  refreshToken(refreshToken: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/refresh?refreshToken=${refreshToken}`, {});
  }

  logout(): Observable<any> {
    this.storage.remove(this.currentUserKey);
    this.storage.remove(this.tokenKey);
    return of({});
  }

  changePassword(data: { oldPassword: string; newPassword: string }): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/change-password`, data, { headers });
  }

  resetPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password?email=${email}`, {});
  }

  resetPasswordConfirm(token: string, newPassword: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/reset-password/confirm?token=${token}&newPassword=${newPassword}`,
      {}
    );
  }

  getProfile(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/profile`, { headers }).pipe(
      tap((response) => {
        const user = this.mapUserResponse(response);
        this.storage.save(this.currentUserKey, user);
      })
    );
  }

  updateProfile(userData: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.apiUrl}/profile`, userData, { headers });
  }

  getUserProfile(userId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/profile/${userId}`, { headers });
  }

  activateAccount(userId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.apiUrl}/activate/${userId}`, {}, { headers });
  }

  deactivateAccount(userId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.apiUrl}/deactivate/${userId}`, {}, { headers });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.storage.get<string>(this.tokenKey);
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  logoutLocal(): void {
    this.storage.remove(this.currentUserKey);
    this.storage.remove(this.tokenKey);
  }

  getCurrentUser(): any | null {
    return this.storage.get<any>(this.currentUserKey);
  }

  getToken(): string | null {
    return this.storage.get<string>(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.getCurrentUser();
  }

  updateCurrentUser(user: any): void {
    this.storage.save(this.currentUserKey, user);
    const users = this.getLocalUsers().map((saved) => saved.id === user.id ? user : saved);
    this.storage.save(this.usersKey, users);
  }

  private getLocalUsers(): any[] {
    return this.storage.get<any[]>(this.usersKey) ?? [];
  }
}
