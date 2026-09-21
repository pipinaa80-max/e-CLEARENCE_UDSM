import { ErrorHandler, Injectable, Injector, NgZone } from '@angular/core';
import { ToastService } from '../services/toast.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private injector: Injector, private zone: NgZone) {}

  handleError(error: any): void {
    const toastService = this.injector.get(ToastService);

    // Errors should be handled inside NgZone to ensure UI updates
    this.zone.run(() => {
      // Check if it's a known error we want to show to the user
      // or just a generic runtime error
      const message = error.message || 'An unexpected runtime error occurred.';

      // Log to console for developers
      console.error('Global Error Handler:', error);

      // Only show toast for non-HTTP errors (HTTP errors are handled by interceptor)
      // and only if they are not common "ignored" errors
      if (!(error instanceof Error && error.stack?.includes('HttpInterceptor'))) {
        toastService.error('System Error', 'A runtime error occurred. Please refresh the page if the issue persists.');
      }
    });
  }
}
