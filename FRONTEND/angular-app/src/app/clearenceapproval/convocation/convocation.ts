// convocation.component.ts - Fixed for students and live demo
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { ConvocationService } from '../../core/services/convocation.service';
import { ClearanceRequest } from '../../core/models/clearance.model';

@Component({
  selector: 'app-convocation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './convocation.html',
  styleUrl: './convocation.css'
})
export class ConvocationComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly convocationService = inject(ConvocationService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  // =====================================================
  // STUDENT FORM
  // =====================================================

  form = this.fb.nonNullable.group({
    controlNumber: [''],
    file: [null as File | null]
  });

  selectedFileName = '';
  selectedFile: File | null = null;
  message = '';
  isLoading = false;

  request: ClearanceRequest | null = null;

  // =====================================================
  // CURRENT USER
  // =====================================================

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  // =====================================================
  // OFFICER CHECK - Redirect staff to dashboard
  // =====================================================

  get isOfficer(): boolean {
    return this.currentUser?.role === 'Convocation';
  }

  // =====================================================
  // INIT - Redirect Convocation staff to dashboard
  // =====================================================

  ngOnInit(): void {
    if (this.isOfficer) {
      console.log('Convocation staff detected - redirecting to dashboard');
      this.router.navigate(['/convocation/dashboard']);
      return;
    }

    this.loadData();
  }

  // =====================================================
  // STUDENT REQUEST
  // =====================================================

  get studentRequest(): ClearanceRequest | null {
    return this.request;
  }

  // =====================================================
  // CHECK IF CONVOCATION IS APPROVED
  // =====================================================

  get isConvocationApproved(): boolean {
    const req = this.studentRequest;
    if (!req) return false;

    const convocationApproval = req.approvals.find(
      approval => approval.office === 'Convocation'
    );

    return convocationApproval?.status === 'Approved';
  }

  // =====================================================
  // CHECK IF CAN CONTINUE TO STEP 2
  // =====================================================

  get canContinueToStep2(): boolean {
    return this.isConvocationApproved;
  }

  // =====================================================
  // CONTINUE TO STEP 2
  // =====================================================

  continueToStep2(): void {
    this.isLoading = true;
    this.message = '';

    const req = this.studentRequest;
    if (!req) {
      this.toastService.warning('Request Missing', 'No active clearance request found.');
      this.isLoading = false;
      return;
    }

    if (!this.isConvocationApproved) {
      this.toastService.warning('Action Required', 'Convocation approval is required first.');
      this.isLoading = false;
      return;
    }

    try {
      if (req.currentStage === 'Convocation') {
        this.clearanceService.advanceStage(req.id, 'Parallel');
      }

      this.notificationService.createNotification(
        req.studentId,
        'Step 2 Started',
        'Convocation clearance approved! You can now proceed with other clearance offices.',
        'success'
      );

      this.toastService.success('Step 2 Started', 'Convocation clearance approved! Redirecting to clearance status...');
      this.message = '✅ Step 2 started successfully! Redirecting...';

      setTimeout(() => {
        this.router.navigate(['/clearance/status']);
      }, 1000);

    } catch (error: any) {
      console.error('Error continuing to step 2:', error);
      this.toastService.error('Stage Error', 'Failed to continue to Step 2. Please try again.');
      this.isLoading = false;
    }
  }

  // =====================================================
  // CHECK IF CONTROL NUMBER WAS REQUESTED
  // =====================================================

  get controlNumberRequested(): boolean {
    const req = this.studentRequest;
    if (!req) return false;
    return !!(req.convocation?.controlNumberRequestedAt);
  }

  // =====================================================
  // CONTROL NUMBER
  // =====================================================

  get controlNumber(): string {
    const req = this.studentRequest;
    return req?.convocation?.controlNumber ?? '';
  }

  // =====================================================
  // RECEIPT SUBMITTED
  // =====================================================

  get receiptSubmitted(): boolean {
    const req = this.studentRequest;
    return !!(req?.convocation?.receiptSubmittedAt);
  }

  // =====================================================
  // LOAD DATA - Student only
  // =====================================================

  loadData(): void {
    if (this.isOfficer) {
      this.router.navigate(['/convocation/dashboard']);
      return;
    }

    const user = this.currentUser;
    if (user && user.role === 'Student') {
      const requests = this.clearanceService.getStudentRequests(user.id);
      this.request = requests.length ? requests[requests.length - 1] : null;
    } else {
      this.request = null;
    }
  }

  // =====================================================
  // REFRESH DATA - Student only
  // =====================================================

  refreshData(): void {
    if (this.isOfficer) {
      this.router.navigate(['/convocation/dashboard']);
      return;
    }

    this.loadData();
    this.message = 'Data refreshed successfully.';

    setTimeout(() => {
      this.message = '';
    }, 3000);
  }

  // =====================================================
  // STUDENT REQUEST CONTROL NUMBER
  // =====================================================

  requestControlNumber(): void {
    this.message = '';

    const req = this.studentRequest;

    if (!req) {
      this.toastService.warning('Not Found', 'No active clearance request was found.');
      return;
    }

    if (req.convocation?.controlNumber) {
      this.toastService.info('Already Issued', 'You already have a control number: ' + req.convocation.controlNumber);
      this.message = 'You already have a control number: ' + req.convocation.controlNumber;
      return;
    }

    this.clearanceService.requestControlNumber(req.id);
    this.loadData();

    this.toastService.success('Control Number Ready', 'Control number generated. Please pay and submit your receipt.');
    this.message = 'Control number ready. Please make payment and upload your payment receipt below.';
  }

  // =====================================================
  // FILE SELECTED
  // =====================================================

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) return;

    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.selectedFileName = file.name;
      this.form.controls.file.setValue(reader.result as any);
    };
    reader.readAsDataURL(file);
  }

  // =====================================================
  // SUBMIT RECEIPT - Student only
  // =====================================================

  submit(): void {
    this.message = '';
    this.isLoading = true;

    const user = this.currentUser;
    const req = this.studentRequest;

    if (!user || !req || !this.selectedFile) {
      this.toastService.warning('File Required', 'Please select a receipt file first.');
      this.isLoading = false;
      return;
    }

    const receiptData = (this.form.controls.file.value as unknown as string) || 'Demo Receipt File';

    const completeLocalSubmission = () => {
      this.clearanceService.submitConvocationReceipt(req.id, receiptData);
      this.notificationService.createNotification(
        user.id,
        'Payment receipt submitted',
        'Your payment receipt has been submitted to Convocation for verification.',
        'success'
      );
      this.toastService.success('Receipt Submitted', 'Payment receipt submitted successfully.');
      this.message = 'Payment receipt submitted successfully. Redirecting to status...';
      this.isLoading = false;
      this.loadData();
      setTimeout(() => this.router.navigate(['/clearance/status']), 1200);
    };

    this.convocationService.submitReceipt({
      studentId: user.id,
      receiptNumber: `RECEIPT-${Date.now().toString().slice(-6)}`,
      paymentDate: new Date().toISOString().slice(0, 10)
    }, this.selectedFile).subscribe({
      next: () => {
        completeLocalSubmission();
      },
      error: (error) => {
        console.warn('Backend unavailable, proceeding with local receipt registration:', error);
        completeLocalSubmission();
      }
    });
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
