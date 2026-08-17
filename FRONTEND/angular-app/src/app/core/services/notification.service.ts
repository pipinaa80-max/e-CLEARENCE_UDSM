import { Injectable } from '@angular/core';

import { NotificationItem, NotificationType } from '../models/notification.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly storage = new StorageService();
  private readonly key = 'udsm-notifications';

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
