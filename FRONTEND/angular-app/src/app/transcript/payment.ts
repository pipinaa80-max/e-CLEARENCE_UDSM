import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { TranscriptPaymentService } from '../core/services/transcript-payment.service';
import { TranscriptPaymentRequest } from './transcript-payment.model';

@Component({
  selector: 'app-transcript-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './payment.html',
  styleUrl: './payment.css'
})
export class TranscriptPaymentComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly paymentService = inject(TranscriptPaymentService);

  request: TranscriptPaymentRequest | null = null;
  message = '';
  errorMessage = '';
  isSubmitting = false;
  transcriptCount = 1;

  get hasApproval(): boolean {
    const user = this.authService.getCurrentUser();
    return !!user && localStorage.getItem(`udsm-transcript-decision-${user.id}`) === 'Approved';
  }

  get nextRequestAmount(): number {
    const user = this.authService.getCurrentUser();
    const isAdditionalRequest = !!user && this.paymentService.getStudentRequests(user.id).length > 0;
    return isAdditionalRequest
      ? this.transcriptCount * 5000
      : 15000 + (this.transcriptCount - 1) * 5000;
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'Student') {
      this.router.navigate(['/login']);
      return;
    }

    this.request = this.paymentService.getStudentRequests(user.id).at(-1) ?? null;
  }

  constructor() {
    if (!this.hasApproval) {
      this.router.navigate(['/transcript']);
    }
  }

  requestControlNumber(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    if (!this.request) {
      const savedDetails = JSON.parse(
          localStorage.getItem(`udsm-transcript-request-${user.id}`) || '{}'
      );

      this.request = this.paymentService.createRequest({
        studentId: user.id,
        studentName: `${savedDetails.surname || ''} ${savedDetails.otherNames || ''}`.trim() || user.fullName,
        registrationNumber: savedDetails.registrationNumber || user.registrationNumber,
        award: savedDetails.award || 'Transcript Request',
        graduationYear: savedDetails.graduationYear || new Date().getFullYear().toString(),
        transcriptCount: this.transcriptCount
      });
      this.message = 'Your control number request has been sent to Finance.';
      return;
    }

    if (this.request.status !== 'Pending Control Number') return;
    this.message = 'Your control number request has already been sent to Finance.';
  }

  onReceiptSelected(event: Event): void {
    this.errorMessage = '';
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.request) return;

    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Please upload a photo of the payment receipt.';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const submitted = this.paymentService.submitReceipt(
          this.request!.id,
          file.name,
          reader.result as string
      );
      if (!submitted) {
        this.errorMessage = 'Receipt cannot be submitted until Finance issues your control number.';
        return;
      }
      this.request = this.paymentService.getStudentRequests(this.request!.studentId).at(-1) ?? null;
      this.message = 'Payment receipt submitted successfully.';
    };
    reader.onerror = () => {
      this.errorMessage = 'Unable to read the receipt photo.';
      input.value = '';
    };
    reader.readAsDataURL(file);
  }
}
