import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectAdminService } from '../../../core/services/project-admin.service';

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="dashboard-header">
      <div class="header-left">
        <button
          *ngIf="showToggle"
          type="button"
          class="sidebar-toggle-btn"
          (click)="onToggleSidebar($event)"
          title="Toggle Navigation Menu"
        >
          <span class="bar"></span>
          <span class="bar"></span>
          <span class="bar"></span>
        </button>

        <div class="header-titles">
          <span class="eyebrow" *ngIf="eyebrow">{{ eyebrow }}</span>
          <h2 *ngIf="title">{{ title }}</h2>
          <p *ngIf="subtitle">{{ subtitle }}</p>
          <ng-content select="[header-titles]"></ng-content>
        </div>
      </div>

      <div class="header-right">
        <!-- Actions container (e.g. notifications, refresh) -->
        <div class="header-actions-container">
          <ng-content select="[header-actions]"></ng-content>
        </div>

        <div class="user-profile" *ngIf="user && user.id">
          <div class="profile-info">
            <span class="user-name">{{ user.fullName || 'User' }}</span>
            <span class="user-role">{{ user.role || 'Role' }}</span>
          </div>
          <div class="avatar-circle">
            <img *ngIf="user.photo || user.profilePhoto" [src]="user.photo || user.profilePhoto" [alt]="user.fullName">
            <span *ngIf="!user.photo && !user.profilePhoto">{{ (user.fullName || 'U').charAt(0) }}</span>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .dashboard-header {
      position: relative;
      z-index: 1100;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-left: 6px solid var(--udsm-gold);
      border-radius: 12px;
      margin-bottom: 24px;
      color: #fff;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .sidebar-toggle-btn {
      position: relative;
      z-index: 1200;
      background: var(--udsm-blue-dark);
      border: 2px solid var(--udsm-gold);
      width: 46px;
      height: 46px;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 4.5px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 10px rgba(0,0,0,0.15);
      flex-shrink: 0;
    }
    .sidebar-toggle-btn:hover {
      background: var(--udsm-blue);
      transform: scale(1.05);
      box-shadow: 0 6px 15px rgba(0,0,0,0.2);
    }
    .sidebar-toggle-btn:active {
      transform: scale(0.95);
    }
    .bar {
      width: 20px;
      height: 2px;
      background: #fff;
      border-radius: 2px;
    }
    .header-titles {
      display: flex;
      flex-direction: column;
    }
    .eyebrow {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--udsm-gold);
      margin-bottom: 4px;
    }
    .header-titles h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 800;
      line-height: 1.2;
    }
    .header-titles p {
      margin: 4px 0 0;
      font-size: 0.95rem;
      opacity: 0.9;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .header-actions-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .user-profile {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-left: 20px;
      border-left: 1.5px solid rgba(255, 255, 255, 0.15);
    }
    .profile-info {
      display: none;
      flex-direction: column;
      text-align: right;
    }
    .user-name {
      display: block;
      font-weight: 700;
      font-size: 0.9rem;
      color: #fff;
    }
    .user-role {
      display: block;
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--udsm-gold);
      opacity: 0.9;
    }
    .avatar-circle {
      width: 42px;
      height: 42px;
      background: var(--udsm-blue-dark);
      border: 2px solid var(--udsm-gold);
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-weight: 800;
      overflow: hidden;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
    }
    .avatar-circle img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    @media (min-width: 992px) {
      .profile-info {
        display: flex;
      }
    }
  `]
})
export class DashboardHeaderComponent {
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() eyebrow?: string;
  @Input() user?: any;
  @Input() showToggle = true;

  @Output() toggleSidebar = new EventEmitter<void>();

  onToggleSidebar(event: Event): void {
    console.log('Header toggle button clicked');
    event.preventDefault();
    event.stopPropagation();
    this.toggleSidebar.emit();
  }
}
