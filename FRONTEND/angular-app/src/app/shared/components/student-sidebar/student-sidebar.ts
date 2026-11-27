import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { ClearanceService } from '../../../core/services/clearance.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-student-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './student-sidebar.html',
  styleUrl: './student-sidebar.css'
})
export class StudentSidebarComponent {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  @Input() open = false;
  @Output() close = new EventEmitter<void>();

  get unreadNotifications(): number {
    return this.notificationService.unreadCount;
  }

  get isTranscriptSystem(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.systemType === 'transcript';
  }

  get isClearanceCompleted(): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    const latest = this.clearanceService.getStudentRequests(user.id).at(-1);
    return latest?.status === 'Completed' || latest?.currentStage === 'Completed';
  }

  get showTranscriptLink(): boolean {
    return this.isTranscriptSystem || this.isClearanceCompleted;
  }

  onClose(): void {
    this.close.emit();
  }

  logout(): void {
    this.onClose();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.open) {
      this.onClose();
    }
  }
}
