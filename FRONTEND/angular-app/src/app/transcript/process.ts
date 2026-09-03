import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { TranscriptPaymentService } from '../core/services/transcript-payment.service';
import { TranscriptPaymentStatus } from './transcript-payment.model';

@Component({
  selector: 'app-transcript-process',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './process.html',
  styleUrl: './process.css'
})
export class TranscriptProcessComponent {
  private readonly authService = inject(AuthService);
  private readonly paymentService = inject(TranscriptPaymentService);
  private readonly router = inject(Router);

  get request() {
    const user = this.authService.getCurrentUser();
    return user ? this.paymentService.getStudentRequests(user.id).at(-1) ?? null : null;
  }

  get hasApproval(): boolean {
    const user = this.authService.getCurrentUser();
    return !!user && localStorage.getItem(`udsm-transcript-decision-${user.id}`) === 'Approved';
  }

  get paymentStatus(): TranscriptPaymentStatus | 'Not Started' {
    return this.request?.status ?? 'Not Started';
  }

  get paymentApproved(): boolean {
    return this.paymentStatus === 'Paid';
  }

  get documentsReady(): boolean {
    return localStorage.getItem(`udsm-transcript-documents-${this.authService.getCurrentUser()?.id}`) === 'Uploaded';
  }

  constructor() {
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'Student') {
      this.router.navigate(['/login']);
    }
  }
}
