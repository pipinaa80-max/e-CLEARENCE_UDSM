import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred';
      let errorTitle = 'Error';
      const isLoginRequest = req.url.includes('/login') || req.url.includes('/auth/login');

      if (error.status === 0) {
        // Network error
        errorTitle = 'Connection Error';
        errorMessage = 'Unable to connect to the server. Please check your internet connection or try again later.';
      } else if (error.status === 401) {
        // Unauthorized
        if (isLoginRequest) {
          errorTitle = 'Authentication Failed';
          errorMessage = getServerMessage(error) || 'Invalid email/registration number or password.';
        } else {
          errorTitle = 'Session Expired';
          errorMessage = 'Your session has expired. Please login again.';
          authService.logoutLocal();
          router.navigate(['/login']);
        }
      } else if (error.status === 403) {
        // Forbidden
        errorTitle = 'Access Denied';
        errorMessage = getServerMessage(error) || 'You do not have permission to perform this action.';
      } else if (error.status === 404) {
        // Not Found
        errorTitle = 'Not Found';
        errorMessage = getServerMessage(error) || 'The requested resource was not found.';
      } else if (error.status === 400 || error.status === 409) {
        // Bad Request or Conflict
        if (isLoginRequest) {
          errorTitle = 'Authentication Failed';
          errorMessage = 'Invalid email/registration number or password.';
        } else {
          errorTitle = 'Request Failed';
          errorMessage = getServerMessage(error) || 'The request could not be processed.';
        }
      } else if (error.status >= 500) {
        // Server Error
        errorTitle = 'Server Error';
        errorMessage = 'A server-side error occurred. Our team has been notified.';
      }

      // Skip toast if requested via header
      const skipToast = req.headers.has('X-Skip-Error-Toast');

      if (!skipToast) {
        // Run inside setTimeout to ensure it doesn't block the request cycle
        // and is visible even if multiple errors happen fast.
        setTimeout(() => {
          toastService.error(errorTitle, errorMessage);
        }, 0);
      }

      // Log error to console for debugging
      console.error(`[${error.status}] ${errorTitle}: ${errorMessage}`, error);

      return throwError(() => error);
    })
  );
};

function getServerMessage(error: HttpErrorResponse): string | null {
  const body = error.error;
  if (typeof body === 'string' && body.trim()) return body.trim();
  if (body && typeof body.message === 'string' && body.message.trim()) return body.message.trim();
  if (body && typeof body.error === 'string' && body.error.trim()) return body.error.trim();
  return null;
}
