import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const token = authService.getToken();

    if (!token) {
      return router.createUrlTree(['/login']);
    }

    const evaluateAccess = () => {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        return router.createUrlTree(['/login']);
      }

      if (allowedRoles.includes(currentUser.role)) {
        return true;
      }

      const redirectPath = thisRoleRedirect(currentUser.role);
      const currentPath = router.url;

      if (currentPath.includes(redirectPath)) {
        console.warn(`🛑 RoleGuard: Loop detected. User with role ${currentUser.role} already on ${currentPath}.`);
        return true;
      }

      return router.createUrlTree([redirectPath]);
    };

    // If the user just logged in or verified their profile in this browser
    // session within the freshness window, avoid an extra /auth/profile call.
    // On a full page refresh, lastProfileVerifiedAt resets to 0 so the server
    // profile is always re-verified before granting access.
    if (authService.hasFreshVerifiedProfile()) {
      return evaluateAccess();
    }

    return authService.getProfile().pipe(
      map(() => evaluateAccess()),
      catchError((error) => {
        console.error('RoleGuard: Could not verify the current user profile.', error);
        authService.logoutLocal();
        return of(router.createUrlTree(['/login']));
      })
    );
  };
};

function thisRoleRedirect(role: UserRole): string {
  const map: Record<UserRole, string> = {
    Student: '/dashboard',
    Convocation: '/dashboard/convocation',
    'Games Coach': '/dashboard/games-coach',
    'Hall Warden': '/dashboard/hall-warden',
    USAB: '/dashboard/usab',
    DARUSO: '/dashboard/daruso',
    Library: '/dashboard/library',
    'Dean of Students': '/dashboard/dean-of-students',
    'Smart Card': '/dashboard/smart-card',
    Department: '/department/dashboard',
    Principal: '/dashboard/principal',
    Finance: '/dashboard/finance',
    Workshop: '/dashboard/workshop',
    Laboratory: '/dashboard/laboratory',
    'Academic Staff': '/dashboard/academic',
    Lecturer: '/dashboard/lecturer',
    'Director of Undergraduate Studies': '/dashboard/director-undergraduate-studies',
    'Director of Postgraduate Studies': '/dashboard/director-postgraduate-studies',
    'DUS Examination Office': '/dashboard/dus-secretary',
    'DUS Secretary': '/dashboard/dus-secretary',
    'Station Secretary': '/dashboard/station-secretary',
    Supervisor: '/dashboard/supervisor',
    Administrator: '/dashboard/admin'
  };

  return map[role] ?? '/dashboard';
}
