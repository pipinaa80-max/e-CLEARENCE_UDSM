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
    Library: '/dashboard/library',
    Department: '/dashboard/department',
    Finance: '/dashboard/finance',
    ICT: '/dashboard/ict',
    'Academic Staff': '/dashboard/academic',
    Administrator: '/dashboard/admin'
  };

  return map[role] ?? '/dashboard';
}
