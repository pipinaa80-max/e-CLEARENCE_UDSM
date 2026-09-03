import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { NotificationService } from '../core/services/notification.service';
import { TranscriptPaymentService } from '../core/services/transcript-payment.service';
import { TranscriptPaymentRequest } from './transcript-payment.model';
import { sortTranscriptRequestsForFinance } from './finance-payment.utils';

@Component({
  selector: 'app-transcript-finance-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './finance-payment.html',
  styleUrl: './finance-payment.css'
})
export class TranscriptFinancePaymentComponent {
  private readonly authService = inject(AuthService);
  private readonly paymentService = inject(TranscriptPaymentService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  controlNumbers: Record<string, string> = {};
  private queuedRequests: TranscriptPaymentRequest[] = [];
  message = '';
  errorMessage = '';

  constructor() {
    if (this.authService.getCurrentUser()?.role !== 'Finance') {
      this.router.navigate(['/login']);
      return;
    }

    this.refreshRequests();
  }

  get requests(): TranscriptPaymentRequest[] {
    return this.queuedRequests;
  }

  get controlNumberRequests(): TranscriptPaymentRequest[] {
    return this.requests.filter(request => request.status === 'Pending Control Number');
  }

  get receiptRequests(): TranscriptPaymentRequest[] {
    return this.requests.filter(request => request.status === 'Receipt Submitted');
  }

  issueControlNumber(request: TranscriptPaymentRequest): void {
    this.message = '';
    this.errorMessage = '';
    const value = this.controlNumbers[request.id]?.trim();
    if (!value) {
      this.errorMessage = 'Enter a control number before issuing it.';
      return;
    }

    if (!this.paymentService.issueControlNumber(request.id, value)) {
      this.errorMessage = 'This request is no longer waiting for a control number.';
      return;
    }

    this.notificationService.createNotification(
        request.studentId,
        'Transcript control number issued',
        `Finance issued control number ${value} for your TSh ${request.amount.toLocaleString()} transcript payment.`,
        'success'
    );
    this.controlNumbers[request.id] = '';
    this.message = `Control number issued to ${request.studentName}.`;
    this.refreshRequests();
  }

  markPaid(request: TranscriptPaymentRequest): void {
    if (!this.paymentService.updateStatus(request.id, 'Paid')) {
      this.errorMessage = 'Unable to verify this receipt.';
      return;
    }
    this.message = `Payment verified for ${request.studentName}.`;
    this.refreshRequests();
  }

  private refreshRequests(): void {
    this.queuedRequests = sortTranscriptRequestsForFinance(
      this.paymentService.getAllRequests()
        .filter(request => request.status === 'Pending Control Number' || request.status === 'Receipt Submitted')
    );
  }
}