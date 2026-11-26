import { Component, Input, Output, EventEmitter, HostListener, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <header class="dashboard-header" role="banner">
      <!-- HEADER LEFT: Mobile Toggle & Page Headings -->
      <div class="header-left">
        <button
          *ngIf="showToggle"
          type="button"
          class="sidebar-toggle-btn"
          (click)="onToggleSidebar($event)"
          title="Toggle Navigation Menu"
          aria-label="Toggle navigation drawer"
        >
          <i class="bi bi-list" aria-hidden="true"></i>
        </button>

        <div class="header-titles">
          <span class="eyebrow" *ngIf="eyebrow">
            <i class="bi bi-shield-check eyebrow-icon" aria-hidden="true"></i>
            {{ eyebrow }}
          </span>
          <h2 *ngIf="title" [title]="title">{{ formattedTitle }}</h2>
          <p *ngIf="subtitle">{{ subtitle }}</p>
          <ng-content select="[header-titles]"></ng-content>
        </div>
      </div>

      <!-- HEADER RIGHT: Custom Actions, User Profile & Fast Logout -->
      <div class="header-right">
        <!-- Projected custom actions (e.g., alerts, quick filters, refresh) -->
        <div class="header-actions-container">
          <ng-content select="[header-actions]"></ng-content>
        </div>

        <!-- USER PROFILE INTERACTIVE TRIGGER -->
        <div
          class="user-profile clickable"
          *ngIf="showProfile && user && (user.id || user.email || user.fullName)"
          (click)="toggleProfileCard($event)"
          (keydown.enter)="toggleProfileCard($event)"
          (keydown.space)="toggleProfileCard($event)"
          tabindex="0"
          role="button"
          [attr.aria-expanded]="showProfileCard"
          aria-haspopup="true"
          title="Account menu: {{ userDisplayName }}"
        >
          <!-- Desktop Name & Role Badge -->
          <div class="profile-info" *ngIf="showProfileInfo">
            <span class="user-name">{{ userDisplayName }}</span>
            <span class="user-role-pill" *ngIf="userRoleLabel">{{ userRoleLabel }}</span>
          </div>

          <!-- Avatar Circle with Notification Dot -->
          <div class="avatar-circle">
            <img
              *ngIf="avatarUrl && !imageLoadFailed"
              [src]="avatarUrl"
              [alt]="userDisplayName"
              (error)="imageLoadFailed = true"
            />
            <span class="avatar-initials" *ngIf="!avatarUrl || imageLoadFailed">
              {{ userInitials }}
            </span>

            <!-- Pulsing Notification Indicator Dot -->
            <span
              class="profile-notification-dot"
              *ngIf="unreadCount > 0"
              [title]="unreadCount + ' unread notifications'"
              aria-label="Unread notifications indicator"
            ></span>
          </div>

          <!-- EXPANDED PROFILE CARD DROPDOWN -->
          <div
            class="profile-dropdown-card"
            *ngIf="showProfileCard"
            (click)="$event.stopPropagation()"
            role="menu"
            aria-label="User profile options"
          >
            <!-- Card Header Profile Info -->
            <div class="profile-card-top">
              <div class="profile-card-top-inner">
                <div class="card-avatar">
                  <img
                    *ngIf="avatarUrl && !imageLoadFailed"
                    [src]="avatarUrl"
                    [alt]="userDisplayName"
                  />
                  <span *ngIf="!avatarUrl || imageLoadFailed">{{ userInitials }}</span>
                </div>
                <div class="card-details">
                  <strong class="card-name" [title]="userDisplayName">{{ userDisplayName }}</strong>
                  <span class="card-reg" *ngIf="userIdentifier">{{ userIdentifier }}</span>
                  <span class="card-role-tag" *ngIf="userRoleLabel">{{ userRoleLabel }}</span>
                </div>
              </div>
            </div>

            <!-- Profile Card Navigation Links -->
            <div class="profile-card-links">
              <a
                routerLink="/profile"
                class="profile-card-link"
                (click)="showProfileCard = false"
                role="menuitem"
              >
                <i class="bi bi-person-circle link-icon" aria-hidden="true"></i>
                <div class="link-text">
                  <span class="link-title">My Profile</span>
                  <small class="link-sub">Account settings &amp; information</small>
                </div>
              </a>

              <a
                routerLink="/notifications"
                class="profile-card-link"
                (click)="showProfileCard = false"
                role="menuitem"
              >
                <i class="bi bi-bell-fill link-icon" aria-hidden="true"></i>
                <div class="link-text">
                  <span class="link-title">Notifications</span>
                  <small class="link-sub">Clearance updates &amp; alerts</small>
                </div>
                <span class="notification-badge-pill" *ngIf="unreadCount > 0">
                  {{ unreadCount }}
                </span>
              </a>

              <div class="dropdown-separator" role="separator"></div>

              <!-- Quick Sign Out in Dropdown -->
              <button
                type="button"
                class="profile-card-link logout-option"
                (click)="onLogout($event)"
                role="menuitem"
              >
                <i class="bi bi-box-arrow-right link-icon logout-icon" aria-hidden="true"></i>
                <div class="link-text">
                  <span class="link-title">Sign Out</span>
                  <small class="link-sub">End current session securely</small>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- FAST LOGOUT BUTTON DIRECTLY ON HEADER -->
        <button
          type="button"
          class="header-logout-btn"
          (click)="onLogout($event)"
          title="Sign Out of Portal"
          aria-label="Sign Out"
        >
          <i class="bi bi-power" aria-hidden="true"></i>
        </button>
      </div>
    </header>
  `,
  styles: [`
    /* =========================================================
       DASHBOARD HEADER CONTAINER (ELEVATED GLASSMORPHIC DESIGN)
    ========================================================= */
    .dashboard-header {
      position: relative;
      z-index: 1100;
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      box-sizing: border-box;
      padding: 16px 22px;
      margin-bottom: 22px;

      /* Multi-stop deep navy gradient with high-end glassmorphism */
      background: linear-gradient(135deg, rgba(0, 31, 52, 0.95) 0%, rgba(0, 59, 92, 0.92) 100%);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);

      /* Elegant UDSM Gold Left Accent with subtle golden top rim */
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-top: 1px solid rgba(245, 158, 11, 0.35);
      border-left: 5px solid var(--udsm-gold, #f59e0b);
      border-radius: 14px;

      color: #ffffff;
      box-shadow:
        0 10px 28px rgba(0, 20, 35, 0.28),
        0 2px 6px rgba(0, 0, 0, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.12);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* =========================================================
       LEFT SIDE: DRAWER TOGGLE & TITLES
    ========================================================= */
    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
      min-width: 0;
      flex: 1 1 auto;
    }

    /* Mobile Navigation Drawer Toggle */
    .sidebar-toggle-btn {
      display: none !important;
      position: relative;
      width: 42px;
      height: 42px;
      min-width: 42px;
      min-height: 42px;
      padding: 0;
      margin: 0;
      border: 1.5px solid rgba(245, 158, 11, 0.7);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @media (max-width: 768px) {
      .sidebar-toggle-btn {
        display: inline-flex !important;
      }
    }

    .sidebar-toggle-btn i {
      font-size: 1.45rem;
      color: #ffffff;
      line-height: 1;
    }

    .sidebar-toggle-btn:hover {
      background: rgba(245, 158, 11, 0.2);
      border-color: #f59e0b;
      transform: scale(1.05);
      box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
    }

    .sidebar-toggle-btn:active {
      transform: scale(0.95);
    }

    /* Title & Eyebrow Styling */
    .header-titles {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1 1 auto;
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #f59e0b !important;
      margin-bottom: 2px;
    }

    .eyebrow-icon {
      font-size: 0.8rem;
    }

    .header-titles h2 {
      margin: 0;
      font-size: clamp(1.05rem, 2.2vw, 1.38rem) !important;
      font-weight: 800 !important;
      line-height: 1.25;
      color: #ffffff !important;
      letter-spacing: -0.01em;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .header-titles p {
      margin: 3px 0 0;
      font-size: clamp(0.78rem, 1.4vw, 0.86rem) !important;
      line-height: 1.35;
      color: rgba(255, 255, 255, 0.85) !important;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* =========================================================
       RIGHT SIDE: ACTIONS, PROFILE TRIGGER & FAST LOGOUT
    ========================================================= */
    .header-right {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-shrink: 0;
      min-width: 0;
    }

    .header-actions-container {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    /* Interactive User Profile Trigger */
    .user-profile {
      position: relative;
      display: flex;
      align-items: center;
      gap: 12px;
      padding-left: 14px;
      border-left: 1.5px solid rgba(255, 255, 255, 0.18);
      cursor: pointer;
      user-select: none;
      outline: none;
      transition: opacity 0.2s ease;
    }

    .user-profile:focus-visible {
      border-radius: 8px;
      box-shadow: 0 0 0 2px #f59e0b;
    }

    .profile-info {
      display: none;
      flex-direction: column;
      align-items: flex-end;
      text-align: right;
      min-width: 0;
      max-width: 220px;
    }

    .user-name {
      display: block;
      font-weight: 800;
      font-size: 0.9rem;
      color: #ffffff !important;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 190px;
    }

    .user-role-pill {
      display: inline-block;
      margin-top: 2px;
      font-size: 0.65rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 1px 7px;
      background: rgba(245, 158, 11, 0.22);
      border: 1px solid rgba(245, 158, 11, 0.5);
      border-radius: 999px;
      color: #fbbf24;
    }

    /* Profile Avatar Circle */
    .avatar-circle {
      position: relative;
      width: 44px;
      height: 44px;
      min-width: 44px;
      min-height: 44px;
      aspect-ratio: 1 / 1;
      background: #001f34;
      border: 2.5px solid #f59e0b;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-weight: 800;
      font-size: 0.95rem;
      color: #ffffff;
      overflow: visible;
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.35);
      flex-shrink: 0;
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease, border-color 0.2s ease;
    }

    .user-profile:hover .avatar-circle {
      transform: scale(1.08);
      border-color: #ffffff;
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.45);
    }

    .avatar-circle img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      object-position: center top;
      display: block;
    }

    .avatar-initials {
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.02em;
    }

    /* Pulsing notification dot on avatar */
    .profile-notification-dot {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 13px;
      height: 13px;
      border: 2px solid #ffffff;
      border-radius: 50%;
      background: #ef4444;
      animation: pulseDot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
    }

    @keyframes pulseDot {
      0%, 100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
      }
      50% {
        transform: scale(1.18);
        box-shadow: 0 0 0 5px rgba(239, 68, 68, 0);
      }
    }

    /* Fast Logout Header Button */
    .header-logout-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      min-width: 40px;
      min-height: 40px;
      padding: 0;
      margin: 0;
      border: 1.5px solid rgba(239, 68, 68, 0.45);
      border-radius: 10px;
      background: rgba(239, 68, 68, 0.16);
      color: #fca5a5;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
    }

    .header-logout-btn i {
      font-size: 1.25rem;
      line-height: 1;
    }

    .header-logout-btn:hover {
      background: #dc2626;
      border-color: #dc2626;
      color: #ffffff;
      transform: scale(1.06);
      box-shadow: 0 4px 14px rgba(220, 38, 38, 0.45);
    }

    .header-logout-btn:active {
      transform: scale(0.95);
    }

    /* =========================================================
       EXPANDED PROFILE DROPDOWN CARD
    ========================================================= */
    .profile-dropdown-card {
      position: absolute;
      top: calc(100% + 14px);
      right: 0;
      width: 295px;
      max-width: calc(100vw - 28px);
      background: #ffffff;
      color: #1e293b;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow:
        0 20px 45px -10px rgba(0, 31, 52, 0.35),
        0 4px 12px rgba(0, 0, 0, 0.08);
      z-index: 3500;
      overflow: hidden;
      animation: profileFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes profileFadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .profile-card-top {
      padding: 18px 18px 14px;
      background: linear-gradient(135deg, #001f34 0%, #003b5c 100%);
      color: #ffffff;
      border-bottom: 2px solid #f59e0b;
    }

    .profile-card-top-inner {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .card-avatar {
      width: 44px;
      height: 44px;
      min-width: 44px;
      min-height: 44px;
      border-radius: 50%;
      border: 2px solid #f59e0b;
      background: #001f34;
      display: grid;
      place-items: center;
      font-weight: 800;
      color: #ffffff;
      overflow: hidden;
      flex-shrink: 0;
    }

    .card-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center top;
      display: block;
    }

    .card-details {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .card-name {
      display: block;
      font-size: 0.96rem;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.25;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-reg {
      display: block;
      margin-top: 2px;
      font-size: 0.78rem;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.75);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-role-tag {
      display: inline-block;
      margin-top: 5px;
      align-self: flex-start;
      font-size: 0.65rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 1px 7px;
      background: rgba(245, 158, 11, 0.25);
      border: 1px solid rgba(245, 158, 11, 0.6);
      border-radius: 999px;
      color: #fef3c7;
    }

    .profile-card-links {
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: #ffffff;
    }

    .profile-card-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 9px 12px;
      border-radius: 10px;
      color: #1e293b;
      text-decoration: none;
      background: transparent;
      border: none;
      width: 100%;
      box-sizing: border-box;
      cursor: pointer;
      font-family: inherit;
      text-align: left;
      transition: all 0.18s ease;
    }

    .profile-card-link:hover {
      background: #f1f5f9;
      color: #003b5c;
      transform: translateX(3px);
    }

    .link-icon {
      font-size: 1.25rem;
      color: #0284c7;
      flex-shrink: 0;
      line-height: 1;
    }

    .link-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1 1 auto;
    }

    .link-title {
      font-size: 0.88rem;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.2;
    }

    .link-sub {
      font-size: 0.72rem;
      color: #64748b;
      margin-top: 1px;
    }

    .notification-badge-pill {
      margin-left: auto;
      background: #ef4444;
      color: #ffffff;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 999px;
      min-width: 18px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(239, 68, 68, 0.35);
    }

    .dropdown-separator {
      height: 1px;
      background: #f1f5f9;
      margin: 4px 6px;
    }

    .logout-option:hover {
      background: #fef2f2;
      color: #b91c1c;
    }

    .logout-option:hover .logout-icon {
      color: #dc2626;
    }

    .logout-icon {
      color: #ef4444;
    }

    .logout-option:hover .link-title {
      color: #b91c1c;
    }

    /* =========================================================
       RESPONSIVE DESIGN (DESKTOP & MOBILE PHONE VIEWS)
    ========================================================= */
    @media (min-width: 992px) {
      .profile-info {
        display: flex;
      }
    }

    @media (max-width: 768px) {
      .dashboard-header {
        padding: 13px 16px;
        margin-bottom: 18px;
        border-radius: 12px;
      }

      .header-titles p {
        display: none;
      }

      .user-profile {
        padding-left: 8px;
        border-left: none;
      }
    }

    @media (max-width: 480px) {
      .dashboard-header {
        padding: 10px 12px;
        gap: 8px;
      }

      .header-left {
        gap: 10px;
      }

      .sidebar-toggle-btn {
        width: 38px;
        height: 38px;
        min-width: 38px;
        min-height: 38px;
      }

      .sidebar-toggle-btn i {
        font-size: 1.3rem;
      }

      .header-titles h2 {
        font-size: 1.02rem !important;
      }

      .eyebrow {
        font-size: 0.65rem;
      }

      .header-right {
        gap: 8px;
      }

      .avatar-circle {
        width: 38px;
        height: 38px;
        min-width: 38px;
        min-height: 38px;
        font-size: 0.85rem;
      }

      .header-logout-btn {
        width: 36px;
        height: 36px;
        min-width: 36px;
        min-height: 36px;
      }

      .profile-dropdown-card {
        right: -8px;
        width: 280px;
        max-width: calc(100vw - 20px);
      }
    }
  `]
})
export class DashboardHeaderComponent implements OnInit {
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() eyebrow?: string;
  @Input() user?: any;
  @Input() showProfile = true;
  @Input() showProfileInfo = true;
  @Input() showToggle = true;

  @Output() toggleSidebar = new EventEmitter<void>();

  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  showProfileCard = false;
  unreadCount = 0;
  imageLoadFailed = false;

  get formattedTitle(): string {
    if (!this.title) return '';
    return this.title.replace(/\bdashboard\b/g, 'Dashboard');
  }

  get userDisplayName(): string {
    if (!this.user) return 'User';
    return this.user.fullName || this.user.name || 'User Profile';
  }

  get userRoleLabel(): string {
    if (!this.user) return '';
    const rawRole = this.user.role || this.user.roleName || this.user.designation || '';
    if (!rawRole) return '';
    return rawRole.replace(/_/g, ' ').toUpperCase();
  }

  get userIdentifier(): string {
    if (!this.user) return '';
    return this.user.registrationNumber || this.user.staffId || this.user.email || '';
  }

  get userInitials(): string {
    const name = this.userDisplayName;
    if (!name || name === 'User Profile') return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  get avatarUrl(): string | null {
    if (!this.user) return null;
    const photo = this.user.photo || this.user.profilePhoto || this.user.profileImageUrl;
    if (!photo) return null;
    if (photo.startsWith('data:image') || photo.startsWith('http') || photo.startsWith('/') || photo.startsWith('assets/')) {
      return photo;
    }
    if (photo.length > 50) {
      return 'data:image/jpeg;base64,' + photo;
    }
    return photo;
  }

  ngOnInit(): void {
    this.loadUnreadCount();
  }

  loadUnreadCount(): void {
    this.notificationService.getStudentNotifications().subscribe({
      next: (items) => {
        this.unreadCount = (Array.isArray(items) ? items : []).filter(i => !i.read).length;
      },
      error: () => {}
    });
  }

  toggleProfileCard(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showProfileCard = !this.showProfileCard;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showProfileCard = false;
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
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
    this.showProfileCard = false;
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
