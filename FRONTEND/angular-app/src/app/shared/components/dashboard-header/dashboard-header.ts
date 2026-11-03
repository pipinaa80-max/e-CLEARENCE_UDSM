import { Component, Input, Output, EventEmitter, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

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
          <i class="bi bi-list" style="font-size: 1.35rem; color: #ffffff;"></i>
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

        <div class="user-profile clickable" *ngIf="showProfile && user && user.id" (click)="toggleProfileCard($event)" title="Click to view complete profile details">
          <div class="profile-info">
            <span class="user-name">{{ user.fullName || 'User' }}</span>
            <span class="user-role">{{ user.role || 'Role' }}</span>
          </div>
          <div class="avatar-circle">
            <img *ngIf="user.photo || user.profilePhoto" [src]="user.photo || user.profilePhoto" [alt]="user.fullName">
            <span *ngIf="!user.photo && !user.profilePhoto">{{ (user.fullName || 'U').charAt(0) }}</span>
          </div>

          <!-- INTERACTIVE PROFILE DETAILS POPUP CARD -->
          <div class="profile-dropdown-card" *ngIf="showProfileCard" (click)="$event.stopPropagation()">
            <div class="profile-card-header">
              <div class="card-avatar">
                <img *ngIf="user.photo || user.profilePhoto" [src]="user.photo || user.profilePhoto" [alt]="user.fullName">
                <span *ngIf="!user.photo && !user.profilePhoto">{{ (user.fullName || 'U').charAt(0) }}</span>
              </div>
              <div class="card-user-titles">
                <strong>{{ user.fullName || 'User Profile' }}</strong>
                <span class="role-badge">{{ user.role || 'Role' }}</span>
              </div>
              <button type="button" class="card-close-btn" (click)="showProfileCard = false; $event.stopPropagation()">&times;</button>
            </div>

            <div class="profile-card-body">
              <div class="detail-row" *ngIf="user.registrationNumber">
                <span class="detail-label">Reg / Staff ID</span>
                <span class="detail-value">{{ user.registrationNumber }}</span>
              </div>

              <div class="detail-row" *ngIf="user.email">
                <span class="detail-label">Email Address</span>
                <span class="detail-value">{{ user.email }}</span>
              </div>

              <div class="detail-row" *ngIf="user.phoneNumber || user.phone">
                <span class="detail-label">Phone Number</span>
                <span class="detail-value">{{ user.phoneNumber || user.phone }}</span>
              </div>

              <div class="detail-row" *ngIf="user.college">
                <span class="detail-label">College / Faculty</span>
                <span class="detail-value">{{ user.college }}</span>
              </div>

              <div class="detail-row" *ngIf="user.department">
                <span class="detail-label">Department / Unit</span>
                <span class="detail-value">{{ user.department }}</span>
              </div>

              <div class="detail-row" *ngIf="user.programme">
                <span class="detail-label">Degree Programme</span>
                <span class="detail-value">{{ user.programme }}</span>
              </div>

              <div class="detail-row" *ngIf="user.hall">
                <span class="detail-label">Hall / Residence</span>
                <span class="detail-value">
                  {{ user.hall }}
                  <ng-container *ngIf="user.roomNumber"> (Room {{ user.roomNumber }})</ng-container>
                </span>
              </div>

              <div class="detail-row" *ngIf="user.clearanceStatus">
                <span class="detail-label">Clearance Status</span>
                <span class="detail-value status-tag">{{ user.clearanceStatus }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- LOGOUT BUTTON DIRECTLY AFTER PROFILE ICON (ICON ONLY) -->
        <button
          type="button"
          class="header-logout-btn"
          (click)="onLogout($event)"
          title="Log Out of System"
        >
          <i class="bi bi-box-arrow-right"></i>
        </button>
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
      width: 100%;
      box-sizing: border-box;
      padding: 16px 20px;
      background: linear-gradient(135deg, #001f34 0%, #003b5c 100%);
      box-shadow: 0 6px 18px rgba(0, 31, 52, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-left: 5px solid var(--udsm-gold, #e5b83c);
      border-radius: 12px;
      margin-bottom: 20px;
      color: #ffffff;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }
    .sidebar-toggle-btn {
      display: none !important;
      position: relative;
      background: rgba(255, 255, 255, 0.12);
      border: 1.5px solid var(--udsm-gold, #e5b83c);
      width: 38px;
      height: 38px;
      border-radius: 8px;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      flex-shrink: 0;
    }
    /* Display toggle button ONLY on Mobile/Tablet (<= 768px) where sidebar is off-canvas */
    @media (max-width: 768px) {
      .sidebar-toggle-btn {
        display: flex !important;
      }
    }
    .sidebar-toggle-btn:hover {
      background: rgba(255, 255, 255, 0.22);
      transform: scale(1.04);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    .sidebar-toggle-btn:active {
      transform: scale(0.96);
    }
    .header-titles {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .eyebrow {
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #f59e0b !important;
      margin-bottom: 2px;
      display: block;
    }
    .header-titles h2 {
      margin: 0;
      font-size: clamp(1.1rem, 2.2vw, 1.35rem) !important;
      font-weight: 800 !important;
      line-height: 1.25;
      color: #ffffff !important;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .header-titles p {
      margin: 3px 0 0;
      font-size: clamp(0.78rem, 1.5vw, 0.85rem) !important;
      line-height: 1.35;
      color: rgba(255, 255, 255, 0.92) !important;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-shrink: 0;
    }
    .header-actions-container {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .user-profile {
      position: relative;
      display: flex;
      align-items: center;
      gap: 10px;
      padding-left: 14px;
      border-left: 1.5px solid rgba(255, 255, 255, 0.2);
      cursor: pointer;
      user-select: none;
    }
    .user-profile:hover .avatar-circle {
      transform: scale(1.08);
      border-color: #ffffff;
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.4);
    }
    .profile-info {
      display: none;
      flex-direction: column;
      text-align: right;
    }
    .user-name {
      display: block;
      font-weight: 800;
      font-size: 0.88rem;
      color: #ffffff !important;
    }
    .user-role {
      display: block;
      font-size: 0.75rem;
      font-weight: 700;
      color: #f59e0b !important;
    }
    .avatar-circle {
      width: 38px;
      height: 38px;
      background: #001f34;
      border: 2px solid #f59e0b;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-weight: 800;
      font-size: 0.9rem;
      color: #ffffff;
      overflow: hidden;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
      flex-shrink: 0;
      transition: all 0.2s ease;
    }
    .avatar-circle img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    /* HEADER LOGOUT BUTTON AFTER PROFILE ICON - COMPACT & SLEEK ICON-ONLY */
    .header-logout-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      min-height: 36px;
      padding: 0;
      border: 1.5px solid rgba(255, 255, 255, 0.35);
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.22);
      color: #ffffff;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      flex-shrink: 0;
    }
    .header-logout-btn i {
      font-size: 1.15rem;
      color: #ffffff;
    }
    .header-logout-btn:hover {
      background: #dc2626;
      border-color: #dc2626;
      color: #ffffff;
      transform: scale(1.08);
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
    }
    .header-logout-btn:active {
      transform: scale(0.96);
    }
    /* PROFILE DROPDOWN CARD */
    .profile-dropdown-card {
      position: absolute;
      top: calc(100% + 14px);
      right: 0;
      width: 310px;
      background: #ffffff;
      color: #1e293b;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
      z-index: 3000;
      overflow: hidden;
      animation: profileFadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    @keyframes profileFadeIn {
      from { opacity: 0; transform: translateY(-8px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .profile-card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: linear-gradient(135deg, #001f34 0%, #003b5c 100%);
      color: #ffffff;
      position: relative;
    }
    .card-avatar {
      width: 44px;
      height: 44px;
      background: #001f34;
      border: 2px solid #f59e0b;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-weight: 800;
      font-size: 1rem;
      color: #ffffff;
      overflow: hidden;
      flex-shrink: 0;
    }
    .card-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .card-user-titles {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .card-user-titles strong {
      font-size: 0.92rem;
      font-weight: 800;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .role-badge {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 700;
      color: #f59e0b;
    }
    .card-close-btn {
      position: absolute;
      top: 6px;
      right: 8px;
      background: transparent;
      border: none;
      color: rgba(255,255,255,0.7);
      font-size: 1.4rem;
      cursor: pointer;
      line-height: 1;
    }
    .card-close-btn:hover {
      color: #ffffff;
    }
    .profile-card-body {
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .detail-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 0.8rem;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 6px;
    }
    .detail-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .detail-label {
      font-size: 0.68rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
    }
    .detail-value {
      font-weight: 700;
      color: #0f172a;
      word-break: break-word;
    }
    .status-tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      background: #e0f2fe;
      color: #0369a1;
      font-weight: 800;
      width: fit-content;
    }
    @media (min-width: 992px) {
      .profile-info {
        display: flex;
      }
    }
    @media (max-width: 680px) {
      .dashboard-header {
        padding: 12px 14px;
        flex-direction: row;
        align-items: center;
        gap: 10px;
      }
      .header-titles p {
        display: none;
      }
      .profile-dropdown-card {
        right: -10px;
        width: 280px;
      }
    }
  `]
})
export class DashboardHeaderComponent {
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() eyebrow?: string;
  @Input() user?: any;
  @Input() showProfile = true;
  @Input() showToggle = true;

  @Output() toggleSidebar = new EventEmitter<void>();

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  showProfileCard = false;

  toggleProfileCard(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showProfileCard = !this.showProfileCard;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showProfileCard = false;
  }

  onToggleSidebar(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.toggleSidebar.emit();
  }

  onLogout(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
