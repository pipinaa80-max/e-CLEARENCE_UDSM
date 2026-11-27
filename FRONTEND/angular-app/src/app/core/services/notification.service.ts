import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { NotificationItem, NotificationType } from '../models/notification.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly storage = new StorageService();
  private readonly key = 'udsm-notifications';
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private readonly notificationsSubject = new BehaviorSubject<NotificationItem[]>([]);
  public readonly notifications$ = this.notificationsSubject.asObservable();

  private readonly unreadCountSubject = new BehaviorSubject<number>(0);
  public readonly unreadCount$ = this.unreadCountSubject.asObservable();

  private refreshUnreadInFlight$: Observable<number> | null = null;
  private notificationsInFlight$: Observable<NotificationItem[]> | null = null;
  private lastNotificationsLoadedAt = 0;
  private activeCacheUserId: string | null = null;

  constructor() {
    // Permanently purge any stale mock notifications stored in localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(this.key);
      }
    } catch {
      // Ignore if localStorage is inaccessible
    }
  }

  private getCurrentAuthUserId(): string {
    const user = this.storage.get<any>('udsm-current-user');
    const id = user?.id ?? user?.userId ?? user?.email ?? null;
    if (id !== null && id !== undefined && String(id).trim() !== '') {
      return `user:${String(id).trim()}`;
    }
    const token = this.storage.get<string>('udsm-auth-token')?.replace(/^"|"$/g, '') || '';
    if (token) {
      return `token:${token.slice(-16)}`;
    }
    return 'anon';
  }

  private ensureCacheMatchesCurrentUser(): void {
    const currentId = this.getCurrentAuthUserId();
    if (this.activeCacheUserId !== currentId) {
      this.notificationsSubject.next([]);
      this.unreadCountSubject.next(0);
      this.refreshUnreadInFlight$ = null;
      this.notificationsInFlight$ = null;
      this.lastNotificationsLoadedAt = 0;
      this.activeCacheUserId = currentId;
    }
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.storage.get<string>('udsm-auth-token')?.replace(/^"|"$/g, '') || null;
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  getStudentNotifications(): Observable<NotificationItem[]> {
    this.ensureCacheMatchesCurrentUser();
    const requestUserId = this.activeCacheUserId;
    if (this.notificationsInFlight$) {
      return this.notificationsInFlight$;
    }

    this.notificationsInFlight$ = this.http.get<NotificationItem[]>(`${this.config.apiUrl}/notifications`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap((items) => {
        if (this.getCurrentAuthUserId() !== requestUserId) return;
        const sorted = (items || []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.notificationsSubject.next(sorted);
        this.updateUnreadCount(sorted);
        this.lastNotificationsLoadedAt = Date.now();
      }),
      catchError((err) => {
        console.warn('Could not load notifications from server:', err);
        return of(this.getCurrentAuthUserId() === requestUserId ? this.notificationsSubject.value : []);
      }),
      finalize(() => {
        this.notificationsInFlight$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    return this.notificationsInFlight$;
  }

  refreshUnreadCount(force: boolean = false): Observable<number> {
    this.ensureCacheMatchesCurrentUser();
    const requestUserId = this.activeCacheUserId;
    if (!force && this.notificationsInFlight$) {
      return this.notificationsInFlight$.pipe(
        map(items => (items || []).filter(n => !n.read).length)
      );
    }
    if (!force && this.lastNotificationsLoadedAt > 0 && (Date.now() - this.lastNotificationsLoadedAt) < 10_000) {
      return of(this.unreadCountSubject.value);
    }
    if (this.refreshUnreadInFlight$) {
      return this.refreshUnreadInFlight$;
    }

    this.refreshUnreadInFlight$ = this.http.get<{ unreadCount: number }>(`${this.config.apiUrl}/notifications/unread-count`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(res => res?.unreadCount ?? 0),
      tap(count => {
        if (this.getCurrentAuthUserId() !== requestUserId) return;
        this.unreadCountSubject.next(count);
      }),
      catchError(() => {
        if (this.getCurrentAuthUserId() !== requestUserId) return of(0);
        const count = this.notificationsSubject.value.filter(n => !n.read).length;
        this.unreadCountSubject.next(count);
        return of(count);
      }),
      finalize(() => {
        this.refreshUnreadInFlight$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    return this.refreshUnreadInFlight$;
  }

  get unreadCount(): number {
    this.ensureCacheMatchesCurrentUser();
    return this.unreadCountSubject.value;
  }

  markStudentNotificationRead(id: string): Observable<any> {
    const updated = this.notificationsSubject.value.map(item =>
      item.id === id ? { ...item, read: true } : item
    );
    this.notificationsSubject.next(updated);
    this.updateUnreadCount(updated);

    return this.http.patch(`${this.config.apiUrl}/notifications/${encodeURIComponent(id)}/read`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(err => {
        console.warn('Failed to mark notification read on backend:', err);
        return of(null);
      })
    );
  }

  markAllStudentNotificationsRead(): Observable<any> {
    const updated = this.notificationsSubject.value.map(item => ({ ...item, read: true }));
    this.notificationsSubject.next(updated);
    this.unreadCountSubject.next(0);

    return this.http.post(`${this.config.apiUrl}/notifications/read-all`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(err => {
        console.warn('Failed to mark all notifications read on backend:', err);
        return of(null);
      })
    );
  }

  markAllReadLocally(): void {
    const updated = this.notificationsSubject.value.map(item => ({ ...item, read: true }));
    this.notificationsSubject.next(updated);
    this.unreadCountSubject.next(0);
    this.markAllStudentNotificationsRead().subscribe();
  }

  deleteNotification(id: string): Observable<any> {
    const updated = this.notificationsSubject.value.filter(item => item.id !== id);
    this.notificationsSubject.next(updated);
    this.updateUnreadCount(updated);

    return this.http.delete(`${this.config.apiUrl}/notifications/${encodeURIComponent(id)}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(err => {
        console.warn('Failed to delete notification on backend:', err);
        return of(null);
      })
    );
  }

  clearAllNotifications(): Observable<any> {
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);

    return this.http.delete(`${this.config.apiUrl}/notifications/clear-all`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(err => {
        console.warn('Failed to clear all notifications on backend:', err);
        return of(null);
      })
    );
  }

  private updateUnreadCount(items: NotificationItem[]): void {
    const count = (items || []).filter(item => !item.read).length;
    this.unreadCountSubject.next(count);
  }

  // Backward compatibility methods
  createNotification(userId: string, title: string, message: string, type: NotificationType): NotificationItem {
    return {
      id: crypto.randomUUID(),
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString()
    };
  }

  getNotifications(userId?: string): NotificationItem[] {
    this.ensureCacheMatchesCurrentUser();
    if (userId && this.activeCacheUserId && this.activeCacheUserId !== `user:${String(userId).trim()}`) {
      return [];
    }
    return this.notificationsSubject.value;
  }

  markAsRead(notificationId: string): void {
    this.markStudentNotificationRead(notificationId).subscribe();
  }

  clearCache(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(this.key);
      }
    } catch {
      // Ignore
    }
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
    this.refreshUnreadInFlight$ = null;
    this.notificationsInFlight$ = null;
    this.lastNotificationsLoadedAt = 0;
    this.activeCacheUserId = null;
  }

  markAllAsRead(userId?: string): void {
    this.markAllStudentNotificationsRead().subscribe();
  }
}
