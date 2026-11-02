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
          <i class="bi bi-list" style="font-size: 1.6rem; color: #ffffff;"></i>
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
      z-index: 2100;
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      box-sizing: border-box;
      padding: 22px 28px;
      background: linear-gradient(135deg, #001f34 0%, #003b5c 100%);
      box-shadow: 0 10px 25px rgba(0, 31, 52, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-left: 6px solid var(--udsm-gold, #e5b83c);
      border-radius: 14px;
      margin-bottom: 24px;
      color: #ffffff;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .sidebar-toggle-btn {
      position: relative;
      z-index: 1200;
      background: rgba(255, 255, 255, 0.12);
      border: 1.5px solid var(--udsm-gold, #e5b83c);
      width: 44px;
      height: 44px;
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
    @media (max-width: 768px) {
      .sidebar-toggle-btn {
        position: fixed;
        top: 16px;
        left: 16px;
        z-index: 2200;
      }
    }
    .sidebar-toggle-btn:hover {
      background: rgba(255, 255, 255, 0.22);
      transform: scale(1.05);
      box-shadow: 0 6px 15px rgba(0,0,0,0.2);
    }
    .sidebar-toggle-btn:active {
      transform: scale(0.95);
    }
    .bar {
      width: 20px;
      height: 2px;
      background: #ffffff;
      border-radius: 2px;
    }
    .header-titles {
      display: flex;
      flex-direction: column;
    }
    .eyebrow {
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #f59e0b !important;
      margin-bottom: 4px;
      display: block;
    }
    .header-titles h2 {
      margin: 0;
      font-size: 1.35rem !important;
      font-weight: 800 !important;
      line-height: 1.25;
      color: #ffffff !important;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }
    .header-titles p {
      margin: 5px 0 0;
      font-size: 0.85rem !important;
      line-height: 1.4;
      color: rgba(255, 255, 255, 0.92) !important;
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
      border-left: 1.5px solid rgba(255, 255, 255, 0.2);
    }
    .profile-info {
      display: none;
      flex-direction: column;
      text-align: right;
    }
    .user-name {
      display: block;
      font-weight: 800;
      font-size: 0.92rem;
      color: #ffffff !important;
    }
    .user-role {
      display: block;
      font-size: 0.78rem;
      font-weight: 700;
      color: #f59e0b !important;
    }
    .avatar-circle {
      width: 44px;
      height: 44px;
      background: #001f34;
      border: 2px solid #f59e0b;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-weight: 800;
      color: #ffffff;
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
    @media (max-width: 680px) {
      .dashboard-header {
        padding: 16px 18px;
        flex-direction: column;
        align-items: flex-start;
        gap: 14px;
      }
      .header-right {
        width: 100%;
        justify-content: space-between;
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
