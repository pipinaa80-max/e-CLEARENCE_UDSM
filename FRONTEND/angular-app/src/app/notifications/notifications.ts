import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { NotificationService } from '../core/services/notification.service';

@Component({ selector: 'app-notifications', standalone: true, imports: [CommonModule, RouterLink], templateUrl: './notifications.html', styleUrl: './notifications.css' })
export class NotificationListComponent {
  private readonly authService = inject(AuthService); private readonly notificationService = inject(NotificationService);
  get user() { return this.authService.getCurrentUser(); } get notifications() { return this.user ? this.notificationService.getNotifications(this.user.id) : []; }
  markAllRead(): void { if (this.user) this.notificationService.markAllAsRead(this.user.id); }
  markRead(id: string): void { this.notificationService.markAsRead(id); }
}
