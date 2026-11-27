import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';
import { SessionActivityService } from '../services/session-activity.service';
import { Router } from '@angular/router';

const RETRIED_AFTER_REFRESH_HEADER = 'X-Retried-After-Refresh';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);
  const authService = inject(AuthService);
  const sessionActivity = inject(SessionActivityService);
  const router = inject(Router);

  const skipToast = req.headers.has('X-Skip-Error-Toast');
  const alreadyRetried = req.headers.has(RETRIED_AFTER_REFRESH_HEADER);

  let cleanHeaders = req.headers;
  if (skipToast) cleanHeaders = cleanHeaders.delete('X-Skip-Error-Toast');
  if (alreadyRetried) cleanHeaders = cleanHeaders.delete(RETRIED_AFTER_REFRESH_HEADER);
  const outgoingReq = (skipToast || alreadyRetried) ? req.clone({ headers: cleanHeaders }) : req;

  return next(outgoingReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const isLoginRequest = req.url.includes('/login') || req.url.includes('/auth/login');
      const isRefreshRequest = req.url.includes('/auth/refresh');
      const isLogoutRequest = req.url.includes('/auth/logout');
      const serverErrCode = String(error.error?.error || '');

      // On 401 for an ACTIVE user whose 30m Access JWT expired, attempt ONE
      // silent refresh using the rotated refresh token before forcing logout.
      const isHardSessionRevocation = ['InactivityTimeout', 'SessionRevoked', 'SessionExpired', 'SecurityBreach'].includes(serverErrCode);
      if (
        error.status === 401 &&
        !isLoginRequest &&
        !isRefreshRequest &&
        !isLogoutRequest &&
        !alreadyRetried &&
        !isHardSessionRevocation &&
        !sessionActivity.isUserIdle() &&
        authService.getRefreshToken()
      ) {
        return authService.refreshAccessToken().pipe(
          switchMap((newToken) => {
            const retried = outgoingReq.clone({
              headers: outgoingReq.headers
                .set('Authorization', `Bearer ${newToken}`)
                .set(RETRIED_AFTER_REFRESH_HEADER, '1')
            });
            return next(retried);
          }),
          catchError(() => {
            authService.logoutLocal();
            if (!skipToast) {
              setTimeout(() => {
                toastService.error('Session Expired', 'Your session has expired. Please login again.');
              }, 0);
            }
            if (!router.url.startsWith('/login')) {
              router.navigate(['/login']);
            }
            return throwError(() => error);
          })
        );
      }

      let errorMessage = 'An unexpected error occurred';
      let errorTitle = 'Error';

      if (error.status === 0) {
        errorTitle = 'Connection Error';
        errorMessage = 'Unable to connect to the server. Please check your internet connection or try again later.';
      } else if (error.status === 401) {
        if (isLoginRequest) {
          errorTitle = 'Authentication Failed';
          errorMessage = 'Incorrect username or password.';
        } else if (!isLogoutRequest) {
          errorTitle = serverErrCode === 'InactivityTimeout' ? 'Session Timed Out' : 'Session Expired';
          errorMessage = getServerMessage(error) || 'Your session has expired. Please login again.';
          authService.logoutLocal();
          if (!router.url.startsWith('/login')) {
            router.navigate(['/login']);
          }
        }
      } else if (error.status === 403) {
        errorTitle = 'Access Denied';
        errorMessage = getServerMessage(error) || 'You do not have permission to perform this action.';
      } else if (error.status === 404) {
        errorTitle = 'Not Found';
        errorMessage = getServerMessage(error) || 'The requested resource was not found.';
      } else if (error.status === 400 || error.status === 409) {
        if (isLoginRequest) {
          errorTitle = 'Authentication Failed';
          errorMessage = 'Incorrect username or password.';
        } else {
          errorTitle = 'Request Failed';
          errorMessage = getServerMessage(error) || 'The request could not be processed.';
        }
      } else if (error.status >= 500) {
        errorTitle = 'Server Error';
        errorMessage = 'A server-side error occurred. Our team has been notified.';
      }

      if (!skipToast && !isLogoutRequest) {
        setTimeout(() => {
          toastService.error(errorTitle, errorMessage);
        }, 0);
      }

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
