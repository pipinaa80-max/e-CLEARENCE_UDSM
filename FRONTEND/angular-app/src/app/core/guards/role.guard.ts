import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const currentUser = authService.getCurrentUser();

    if (!currentUser) {
      return router.createUrlTree(['/login']);
    }

    if (allowedRoles.includes(currentUser.role)) {
      return true;
    }

    return router.createUrlTree([thisRoleRedirect(currentUser.role)]);
  };
};

function thisRoleRedirect(role: UserRole): string {
  const map: Record<UserRole, string> = {
    Student: '/dashboard',
    Convocation: '/convocation/dashboard',
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
    ICT: '/dashboard/ict',
    'Academic Staff': '/dashboard/academic',
    Administrator: '/dashboard/admin'
  };

  return map[role] ?? '/dashboard';
}
