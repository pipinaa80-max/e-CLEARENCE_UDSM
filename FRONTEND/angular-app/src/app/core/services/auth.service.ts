import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, tap, map, catchError, timeout, throwError, finalize, shareReplay } from 'rxjs';
import { UserRole } from '../models/user.model';
import { StorageService } from './storage.service';
import { SubdomainService } from './subdomain.service';
import { ConfigService } from './config.service';
import { ClearanceService } from './clearance.service';
import { NotificationService } from './notification.service';
import { clearRequestDedupCache } from '../interceptors/request-dedup.interceptor';
import { isPostgraduateEntity } from '../utils/postgraduate.util';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly storage = new StorageService();
  private get apiUrl(): string {
    return `${this.config.apiUrl}/auth`;
  }
  private readonly currentUserKey = 'udsm-current-user';
  private readonly tokenKey = 'udsm-auth-token';
  private readonly refreshTokenKey = 'udsm-refresh-token';
  private readonly lastActivityKey = 'udsm-last-activity-at';
  private refreshInFlight$: Observable<string> | null = null;

  register(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, user).pipe(timeout(30000));
  }

  verifyEmail(token: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-email?token=${encodeURIComponent(token)}`, {});
  }

  resendVerificationEmail(email: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/resend-verification?email=${encodeURIComponent(email.trim())}`,
      {}
    );
  }

  login(identifier: string, password: string): Observable<any> {
    const normalized = identifier.trim();
    const isControlPlaneAccount = normalized.toLowerCase().endsWith('@admin.local') || normalized.toLowerCase().includes('project.admin');
    // Only control-plane accounts need a fallback request after the main login fails.
    const headers = isControlPlaneAccount
      ? new HttpHeaders({ 'X-Skip-Error-Toast': 'true' })
      : undefined;

    return this.http.post<any>(`${this.apiUrl}/login`, { identifier: normalized, password }, headers ? { headers } : {}).pipe(
      timeout(15000),
      map(response => {
        const data = response.data || response;
        const user = this.mapUserResponse(data);

        if (this.isUserSuspended(user)) {
          this.logoutLocal();
          throw {
            status: 403,
            error: { message: 'Institutional Access Suspended: Access to all institutional staff and dashboards has been suspended.' },
            message: 'Institutional Access Suspended: Access to all institutional staff and dashboards has been suspended.'
          };
        }

        this.persist(
          user,
          data.access_token || data.accessToken || data.token,
          data.refresh_token || data.refreshToken
        );
        return user;
      }),
      catchError(error => {
        // Fallback to superuser backend (this request will show a toast if it fails)
        if (isControlPlaneAccount && (error?.status === 0 || error?.status === 401 || error?.status === 403)) {
          return this.loginWithSuperuserBackend(normalized, password);
        }
        return throwError(() => error);
      })
    );
  }

  private loginWithSuperuserBackend(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.config.superuserApiUrl}/login`, { email, password }).pipe(
      map(response => {
        const admin = response.user ?? {};
        const user = {
          ...admin,
          id: admin.adminId ?? admin.id ?? admin.email,
          fullName: admin.name ?? admin.fullName ?? admin.email,
          email: admin.email,
          role: admin.role === 'SUPERUSER' ? 'Administrator' as UserRole : 'Administrator' as UserRole,
          projectId: admin.projectId,
          permissions: admin.permissions ?? []
        };
        this.persist(user, response.token);
        return user;
      })
    );
  }

  public mapRole(roleInput: any): UserRole {
    // Safety check: deeply unwrap role if it's nested as an object (due to previous bug)
    let current = roleInput;
    let depth = 0;
    while (current && typeof current === 'object' && depth < 5) {
      current = current.role;
      depth++;
    }

    const roleString = String(current || '').trim().toUpperCase();
    const map: Record<string, UserRole> = {
      STUDENT: 'Student',
      CONVOCATION_OFFICER: 'Convocation',
      CONVOCATION: 'Convocation',
      'CONVOCATION OFFICER': 'Convocation',
      GAMES_COACH: 'Games Coach',
      'GAMES COACH': 'Games Coach',
      HALL_WARDEN: 'Hall Warden',
      'HALL WARDEN': 'Hall Warden',
      USAB_OFFICER: 'USAB',
      USAB: 'USAB',
      DARUSO_OFFICER: 'DARUSO',
      DARUSO: 'DARUSO',
      LIBRARY_OFFICER: 'Library',
      LIBRARY: 'Library',
      DEAN_OF_STUDENTS: 'Dean of Students',
      'DEAN OF STUDENTS': 'Dean of Students',
      SMART_CARD_OFFICER: 'Smart Card',
      'SMART CARD': 'Smart Card',
      ICT_OFFICER: 'Smart Card',
      ICT: 'Smart Card',
      WORKSHOP_OFFICER: 'Workshop',
      WORKSHOP: 'Workshop',
      PRINCIPAL: 'Principal',
      FINANCE_OFFICER: 'Finance',
      FINANCE: 'Finance',
      DEPARTMENT_OFFICER: 'Department',
      DEPARTMENT: 'Department',
      LABORATORY_OFFICER: 'Laboratory',
      LABORATORY: 'Laboratory',
      ACADEMIC_STAFF: 'Academic Staff',
      'ACADEMIC STAFF': 'Academic Staff',
      LECTURER: 'Lecturer',
      DIRECTOR_OF_UNDERGRADUATE_STUDIES: 'Director of Undergraduate Studies',
      'DIRECTOR OF UNDERGRADUATE STUDIES': 'Director of Undergraduate Studies',
      'DIRECTOR OF UNDEGRADUATE STUDIES': 'Director of Undergraduate Studies',
      DUS: 'Director of Undergraduate Studies',
      DIRECTOR_OF_POSTGRADUATE_STUDIES: 'Director of Postgraduate Studies',
      'DIRECTOR OF POSTGRADUATE STUDIES': 'Director of Postgraduate Studies',
      'Director of Postgraduate Studies': 'Director of Postgraduate Studies',
      DPGS: 'Director of Postgraduate Studies',
      DUS_SECRETARY: 'DUS Examination Office',
      'DUS SECRETARY': 'DUS Examination Office',
      'DUS Secretary': 'DUS Examination Office',
      DUS_EXAMINATION_OFFICE: 'DUS Examination Office',
      'DUS EXAMINATION OFFICE': 'DUS Examination Office',
      'DUS Examination Office': 'DUS Examination Office',
      STATION_SECRETARY: 'Station Secretary',
      'STATION SECRETARY': 'Station Secretary',
      SUPERVISOR: 'Supervisor',
      SUPERVISOR_OFFICER: 'Supervisor',
      'RESEARCH SUPERVISOR': 'Supervisor',
      ADMINISTRATOR: 'Administrator',
      ADMIN: 'Administrator',
      SUPERUSER: 'Administrator'
    };

    if (map[roleString]) return map[roleString];
    if (roleString === 'ACADEMIC STAFF') return 'Academic Staff';

    // Default to Student to prevent infinite redirect loops if role is invalid
    return 'Student';
  }

  public mapUserResponse(response: any): any {
    const mappedRole = response.role ? this.mapRole(response.role) : undefined;
    const isPostgrad = isPostgraduateEntity(response);
    const resolvedAward = response.award || (mappedRole === 'Student' ? (isPostgrad ? 'Postgraduate' : 'Bachelor Degree') : null);
    const user = {
      ...response,
      id: response.user_id || response.userId || response.id,
      fullName: response.full_name || response.fullName,
      registrationNumber: response.registration_number || response.registrationNumber,
      award: resolvedAward,
      college: response.college || response.faculty,
      programme: response.programme,
      department: response.department,
      hall: response.hall,
      wing: response.wing,
      block: response.block,
      roomNumber: response.room_number || response.roomNumber,
      sponsor: response.sponsor,
      phoneNumber: response.phone_number || response.phoneNumber || response.phone,
      isActive: response.isActive !== undefined ? response.isActive : (response.active !== undefined ? response.active : response.is_active),
      lastLogin: response.last_login || response.lastLogin,
      createdAt: response.created_at || response.createdAt,
      updatedAt: response.updated_at || response.updatedAt,
      clearanceStatus: response.clearance_status || response.clearanceStatus,
      isFinalYear: response.isFinalYear !== undefined ? response.isFinalYear : (response.finalYear !== undefined ? response.finalYear : response.is_final_year),
      stationCode: response.station_code || response.stationCode,
      stationName: response.station_name || response.stationName,
      isPostgraduate: isPostgrad,
      undergraduateCertificateUrl: response.undergraduateCertificateUrl || response.undergraduate_certificate_url,
      photo: response.photo || response.profilePhoto || response.profile_photo || response.profileImageUrl || response.profile_image_url
    };
    if (mappedRole) {
      // Differentiate Main Campus DUS Examination Office from Regional Station Secretary
      const isRegionalStation = user.stationCode && user.stationCode.toUpperCase() !== 'UDSM-MAIN';
      if ((mappedRole === 'DUS Examination Office' || mappedRole === 'DUS Secretary') && isRegionalStation) {
        user.role = 'Station Secretary';
      } else {
        user.role = mappedRole;
      }
    }
    return user;
  }

  getProfilePhotoSource(user: any = this.getCurrentUser()): string | null {
    const photo = user?.profilePhoto ?? user?.photo ?? user?.profileImageUrl ?? user?.profile_image_url;
    if (typeof photo !== 'string') return null;

    const source = photo.trim();
    if (!source) return null;
    if (/^data:image\//i.test(source) || /^(https?:|blob:)/i.test(source) || source.startsWith('/')) {
      return source;
    }
    if (/^(?:\.{1,2}\/)?[\w.-]+(?:\/[\w.-]+)*\.(?:png|jpe?g|gif|webp|svg)(?:[?#].*)?$/i.test(source)) {
      return source;
    }
    return source.length > 100 ? `data:image/jpeg;base64,${source}` : null;
  }

  refreshToken(refreshToken: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/refresh`, { refreshToken }, {
      headers: new HttpHeaders({ 'X-Skip-Error-Toast': 'true' })
    });
  }

  /**
   * Single-flight access token refresh using the stored refresh token.
   * Updates both accessToken and rotated refreshToken in storage.
   */
  refreshAccessToken(): Observable<string> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }
    const storedRefresh = this.getRefreshToken();
    if (!storedRefresh || this.isTokenExpired(storedRefresh, 0)) {
      return throwError(() => new Error('No valid refresh token available.'));
    }

    this.refreshInFlight$ = this.http.post<any>(
      `${this.apiUrl}/refresh`,
      { refreshToken: storedRefresh },
      { headers: new HttpHeaders({ 'X-Skip-Error-Toast': 'true' }) }
    ).pipe(
      map((res) => {
        const nextAccess = res?.accessToken || res?.access_token || res?.token;
        const nextRefresh = res?.refreshToken || res?.refresh_token;
        if (!nextAccess) {
          throw new Error('Refresh response did not include an access token.');
        }
        this.storage.save(this.tokenKey, nextAccess);
        if (nextRefresh) {
          this.storage.save(this.refreshTokenKey, nextRefresh);
        }
        this.lastProfileVerifiedAt = Date.now();
        return nextAccess as string;
      }),
      finalize(() => {
        this.refreshInFlight$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    return this.refreshInFlight$;
  }

  /**
   * Revokes the current session & JWT on the backend (fire-and-forget safe even
   * when callers do not subscribe) and immediately clears local session state.
   */
  logout(allDevices: boolean = false): Observable<any> {
    const token = this.getToken();
    const refreshToken = this.getRefreshToken();

    if (token) {
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
        'X-Skip-Error-Toast': 'true'
      });
      this.http.post(
        `${this.apiUrl}/logout`,
        { refreshToken: refreshToken || undefined, allDevices },
        { headers }
      ).subscribe({ next: () => {}, error: () => {} });
    }

    this.logoutLocal();
    return of({ success: true });
  }

  changePassword(data: { currentPassword: string; newPassword: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/change-password`, data, { headers: this.getAuthHeaders() });
  }

  resetPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password?email=${email}`, {});
  }

  resetPasswordConfirm(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password/confirm?token=${token}&newPassword=${newPassword}`, {});
  }

  private profileInFlight$: Observable<any> | null = null;
  private lastProfileVerifiedAt = 0;
  private readonly profileFreshMs = 60_000;

  hasFreshVerifiedProfile(maxAgeMs: number = this.profileFreshMs): boolean {
    if (!this.getToken() || !this.getCurrentUser()) return false;
    return this.lastProfileVerifiedAt > 0 && (Date.now() - this.lastProfileVerifiedAt) < maxAgeMs;
  }

  getProfile(force: boolean = false): Observable<any> {
    if (!force && this.profileInFlight$) {
      return this.profileInFlight$;
    }
    let headers = this.getAuthHeaders();
    if (force) {
      headers = headers.set('X-Skip-Dedup-Cache', 'true');
    }
    const req$ = this.http.get(`${this.apiUrl}/profile`, { headers }).pipe(
      tap(response => {
        const user = this.mapUserResponse(response);
        this.updateCurrentUser(user);
        this.lastProfileVerifiedAt = Date.now();
      }),
      finalize(() => {
        this.profileInFlight$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    if (!force) {
      this.profileInFlight$ = req$;
    }
    return req$;
  }

  updateProfile(userData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/profile`, userData, { headers: this.getAuthHeaders() });
  }

  getUserProfile(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/profile/${userId}`, { headers: this.getAuthHeaders() });
  }

  activateAccount(userId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/activate/${userId}`, {}, { headers: this.getAuthHeaders() });
  }

  deactivateAccount(userId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/deactivate/${userId}`, {}, { headers: this.getAuthHeaders() });
  }

  private isUserSuspended(user: any): boolean {
    if (!user) return false;

    // Check individual user active status
    if (user.isActive === false || user.active === false || user.is_active === false) {
      return true;
    }

    // Check tenant active status
    try {
      const subdomainService = inject(SubdomainService);
      const tenants = subdomainService.getSubdomains();
      const userEmail = (user.email || user.username || '').toLowerCase();
      const domain = userEmail.includes('@') ? userEmail.split('@')[1] : '';

      for (const t of tenants) {
        if (t.active === false) {
          const tDomain = (t.adminEmail || '').toLowerCase().split('@')[1];
          if (tDomain && domain && tDomain === domain) {
            return true;
          }
          if (user.projectId && t.id.includes(user.projectId)) {
            return true;
          }
          if (userEmail.includes('udom') || (user.college && user.college.toLowerCase().includes('dodoma'))) {
            if (t.subdomain === 'udom' || t.adminEmail.includes('udom')) {
              return true;
            }
          }
        }
      }
    } catch (_) {
      // Ignore injection error outside component context
    }

    return false;
  }

  private cachedUser: any | null = null;

  getCurrentUser(): any | null {
    const user = this.cachedUser || this.storage.get<any>(this.currentUserKey);
    if (!user) return null;

    if (this.isUserSuspended(user)) {
      this.logoutLocal();
      return null;
    }

    this.cachedUser = { ...user, role: this.mapRole(user.role) };
    return this.cachedUser;
  }

  getToken(): string | null {
    return this.storage.get<string>(this.tokenKey)?.replace(/^"|"$/g, '') || null;
  }

  getRefreshToken(): string | null {
    return this.storage.get<string>(this.refreshTokenKey)?.replace(/^"|"$/g, '') || null;
  }

  decodeJwtPayload(token: string | null): Record<string, any> | null {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  }

  isTokenExpired(token: string | null, skewSeconds: number = 15): boolean {
    const payload = this.decodeJwtPayload(token);
    if (!payload || typeof payload['exp'] !== 'number') return false;
    return (payload['exp'] * 1000) <= (Date.now() + skewSeconds * 1000);
  }

  isLoggedIn(): boolean {
    const user = this.getCurrentUser();
    const token = this.getToken();
    if (!token || !user) return false;
    if (this.isUserSuspended(user)) return false;

    // Enforce client-side 30m inactivity check before allowing protected routes
    try {
      const lastActivity = Number(localStorage.getItem(this.lastActivityKey) || 0);
      if (lastActivity > 0 && (Date.now() - lastActivity) >= 30 * 60 * 1000) {
        this.logout();
        return false;
      }
    } catch {}

    // If access token expired, only consider session alive if a valid refresh token exists
    if (this.isTokenExpired(token, 0)) {
      const refresh = this.getRefreshToken();
      if (!refresh || this.isTokenExpired(refresh, 0)) {
        this.logoutLocal();
        return false;
      }
    }
    return true;
  }

  updateCurrentUser(user: any): void {
    this.cachedUser = this.mapUserResponse(user);
    this.storage.save(this.currentUserKey, this.cachedUser);
  }

  logoutLocal(): void {
    this.cachedUser = null;
    this.profileInFlight$ = null;
    this.refreshInFlight$ = null;
    this.lastProfileVerifiedAt = 0;
    clearRequestDedupCache();
    this.clearanceService.clearCache();
    this.notificationService.clearCache();
    this.storage.remove(this.currentUserKey);
    this.storage.remove(this.tokenKey);
    this.storage.remove(this.refreshTokenKey);
    this.storage.remove(this.lastActivityKey);
    this.storage.remove('udsm-clearance-requests');
    this.storage.remove('udsm-clearance-drafts');
    this.storage.remove('udsm-notifications');
    this.storage.remove('udsm-unread-notifications');
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private persist(user: any, token: string | undefined, refreshToken?: string): void {
    clearRequestDedupCache();
    this.clearanceService.clearCache();
    this.notificationService.clearCache();
    this.cachedUser = user;
    this.lastProfileVerifiedAt = Date.now();
    this.storage.save(this.currentUserKey, user);
    if (token) this.storage.save(this.tokenKey, token);
    if (refreshToken) this.storage.save(this.refreshTokenKey, refreshToken);
    try {
      localStorage.setItem(this.lastActivityKey, String(Date.now()));
    } catch {}
  }
}
