import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { TranscriptPaymentService } from '../core/services/transcript-payment.service';
import { ToastService } from '../core/services/toast.service';
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
  private readonly toastService = inject(ToastService);

  request: TranscriptPaymentRequest | null = null;
  message = '';
  isSubmitting = false;
  transcriptCount = 1;
  selectedFile: File | null = null;

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

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.message = '';

    if (file && file.size > 1.5 * 1024 * 1024) {
      this.toastService.warning('File Too Large', 'This photo is too large for the system to process. Please upload a smaller file or a compressed JPG (Max 1.5MB).');
      this.selectedFile = null;
      input.value = '';
      return;
    }

    this.selectedFile = file;
  }

  submitReceipt(): void {
    if (!this.selectedFile || !this.request) return;

    this.isSubmitting = true;
    this.message = '';

    // Safety timeout to prevent permanent "Submitting..." hang
    const safetyTimeout = setTimeout(() => {
      if (this.isSubmitting) {
        this.isSubmitting = false;
        this.toastService.error('Timeout', 'The submission is taking too long. Please try a smaller photo or a screenshot.');
      }
    }, 10000);

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const submitted = this.paymentService.submitReceipt(
            this.request!.id,
            this.selectedFile!.name,
            reader.result as string
        );

        clearTimeout(safetyTimeout);

        if (submitted) {
          this.toastService.success('Success', 'Payment receipt submitted successfully to Finance.');
          // Refresh local request state immediately
          const user = this.authService.getCurrentUser();
          if (user) {
            this.request = this.paymentService.getStudentRequests(user.id).at(-1) ?? null;
          }
          this.selectedFile = null;
        } else {
          this.toastService.error('Error', 'Finance could not receive the receipt. Please try a smaller photo.');
        }
      } catch (error) {
        console.error('Submission failed:', error);
        this.toastService.error('Submission Failed', 'The photo data is too heavy for the browser. Please use a screenshot instead.');
      } finally {
        this.isSubmitting = false;
      }
    };

    reader.onerror = () => {
      clearTimeout(safetyTimeout);
      this.toastService.error('Read Error', 'Unable to read the receipt photo.');
      this.isSubmitting = false;
    };

    reader.readAsDataURL(this.selectedFile);
  }

  onReceiptSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.request) return;

    if (!file.type.startsWith('image/')) {
      this.toastService.warning('Invalid Format', 'Please upload a photo of the payment receipt.');
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
        this.toastService.warning('Action Required', 'Receipt cannot be submitted until Finance issues your control number.');
        return;
      }
      this.request = this.paymentService.getStudentRequests(this.request!.studentId).at(-1) ?? null;
      this.toastService.success('Success', 'Payment receipt submitted successfully.');
    };
    reader.onerror = () => {
      this.toastService.error('Read Error', 'Unable to read the receipt photo.');
      input.value = '';
    };
    reader.readAsDataURL(file);
  }
}
