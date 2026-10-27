import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

import { NotificationItem, NotificationType } from '../models/notification.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly storage = new StorageService();
  private readonly key = 'udsm-notifications';
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  getStudentNotifications(): Observable<NotificationItem[]> {
    const token = this.storage.get<string>('udsm-auth-token')?.replace(/^"|"$/g, '') || null;
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    return this.http.get<NotificationItem[]>(`${this.config.apiUrl}/notifications`, { headers });
  }

  markStudentNotificationRead(id: string): void {
    const token = this.storage.get<string>('udsm-auth-token')?.replace(/^"|"$/g, '') || null;
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    this.http.patch(`${this.config.apiUrl}/notifications/${encodeURIComponent(id)}/read`, {}, { headers }).subscribe();
  }

  markAllStudentNotificationsRead(): void {
    const token = this.storage.get<string>('udsm-auth-token')?.replace(/^"|"$/g, '') || null;
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    this.http.post(`${this.config.apiUrl}/notifications/read-all`, {}, { headers }).subscribe();
  }

  createNotification(userId: string, title: string, message: string, type: NotificationType): NotificationItem {
    const item: NotificationItem = {
      id: crypto.randomUUID(),
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString()
    };

    const notifications = this.getNotifications(userId);
    notifications.unshift(item);
    this.storage.save(this.key, notifications);
    return item;
  }

  getNotifications(userId: string): NotificationItem[] {
    const all = this.storage.get<NotificationItem[]>(this.key) ?? [];
    return all.filter((item) => item.userId === userId);
  }

  markAsRead(notificationId: string): void {
    const notifications = (this.storage.get<NotificationItem[]>(this.key) ?? []).map((item) =>
      item.id === notificationId ? { ...item, read: true } : item
    );
    this.storage.save(this.key, notifications);
  }

  markAllAsRead(userId: string): void {
    const notifications = (this.storage.get<NotificationItem[]>(this.key) ?? []).map((item) =>
      item.userId === userId ? { ...item, read: true } : item
    );
    this.storage.save(this.key, notifications);
  }
}
