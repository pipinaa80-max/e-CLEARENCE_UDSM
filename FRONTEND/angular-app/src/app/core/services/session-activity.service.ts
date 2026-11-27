import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

const LAST_ACTIVITY_STORAGE_KEY = 'udsm-last-activity-at';
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes (mirrors backend SESSION_INACTIVITY_TIMEOUT_MS)
const WARNING_THRESHOLD_MS = 28 * 60 * 1000; // Warn 2 minutes before auto-logout
const CHECK_INTERVAL_MS = 15 * 1000; // Check every 15s (zero network traffic)
const ACTIVITY_WRITE_THROTTLE_MS = 5 * 1000;

/**
 * Monitors real user interaction across browser tabs and automatically logs out
 * inactive sessions after 30 minutes — even if the user makes zero clicks or
 * API calls — while keeping active users seamlessly signed in.
 */
@Injectable({ providedIn: 'root' })
export class SessionActivityService {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly ngZone = inject(NgZone);

  private started = false;
  private warningShown = false;
  private lastWriteAt = 0;
  private checkTimer: ReturnType<typeof setInterval> | null = null;

  private readonly onActivity = (): void => {
    if (!this.authService.getToken()) return;
    const now = Date.now();
    if (now - this.lastWriteAt < ACTIVITY_WRITE_THROTTLE_MS) return;
    this.recordActivity(now);
  };

  private readonly onVisibilityChange = (): void => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      this.evaluateInactivity();
    }
  };

  private readonly onStorageSync = (event: StorageEvent): void => {
    if (event.key === LAST_ACTIVITY_STORAGE_KEY && event.newValue) {
      this.warningShown = false;
    }
    // Cross-tab logout sync: if another tab cleared the token, redirect this tab too
    if (event.key === 'udsm-auth-token' && !event.newValue) {
      this.ngZone.run(() => {
        if (!this.router.url.startsWith('/login')) {
          this.authService.logoutLocal();
          this.router.navigate(['/login']);
        }
      });
    }
  };

  start(): void {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;

    if (this.authService.getToken() && !this.getLastActivityAt()) {
      this.recordActivity(Date.now());
    }

    this.ngZone.runOutsideAngular(() => {
      const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
      events.forEach(ev => window.addEventListener(ev, this.onActivity, { passive: true }));
      document.addEventListener('visibilitychange', this.onVisibilityChange);
      window.addEventListener('storage', this.onStorageSync);

      this.checkTimer = setInterval(() => this.evaluateInactivity(), CHECK_INTERVAL_MS);
    });
  }

  recordActivity(timestamp: number = Date.now()): void {
    this.lastWriteAt = timestamp;
    this.warningShown = false;
    try {
      localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(timestamp));
    } catch {
      // Ignore storage quota / private mode errors
    }
  }

  getLastActivityAt(): number {
    try {
      const val = Number(localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY) || 0);
      return Number.isFinite(val) ? val : 0;
    } catch {
      return 0;
    }
  }

  isUserIdle(limitMs: number = INACTIVITY_LIMIT_MS): boolean {
    const last = this.getLastActivityAt();
    if (!last) return false;
    return (Date.now() - last) >= limitMs;
  }

  private evaluateInactivity(): void {
    const token = this.authService.getToken();
    if (!token) {
      this.warningShown = false;
      return;
    }

    let last = this.getLastActivityAt();
    if (!last) {
      this.recordActivity(Date.now());
      return;
    }

    const idleMs = Date.now() - last;

    if (idleMs >= INACTIVITY_LIMIT_MS) {
      this.warningShown = false;
      this.ngZone.run(() => {
        this.authService.logout();
        this.toastService.warning(
          'Session Expired',
          'You were signed out automatically after 30 minutes of inactivity.'
        );
        if (!this.router.url.startsWith('/login')) {
          this.router.navigate(['/login']);
        }
      });
      return;
    }

    if (idleMs >= WARNING_THRESHOLD_MS && !this.warningShown) {
      this.warningShown = true;
      this.ngZone.run(() => {
        this.toastService.warning(
          'Inactivity Warning',
          'Your session will expire in 2 minutes due to inactivity. Interact with the page to stay signed in.'
        );
      });
    }
  }
}
