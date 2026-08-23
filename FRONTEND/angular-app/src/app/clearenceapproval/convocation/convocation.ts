// convocation.component.ts - Fixed for new students
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { DocumentService } from '../../core/services/document.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';

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
  private readonly documentService = inject(DocumentService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  // =====================================================
  // STUDENT FORM
  // =====================================================

  form = this.fb.nonNullable.group({
    controlNumber: [''],
    file: [null as File | null]
  });

  selectedFileName = '';
  errorMessage = '';
  message = '';
  isLoading = false;

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
    // If user is Convocation staff, redirect to the dashboard
    if (this.isOfficer) {
      console.log('Convocation staff detected - redirecting to dashboard');
      this.router.navigate(['/convocation/dashboard']);
      return;
    }

    // For students, load the student view
    this.loadData();
  }

  // =====================================================
  // STUDENT REQUEST - RELOADED ON EACH ACCESS
  // =====================================================

  get studentRequest(): ClearanceRequest | null {
    const user = this.currentUser;

    if (!user || user.role !== 'Student') {
      return null;
    }

    // Force reload from storage
    const requests = this.clearanceService.getStudentRequests(user.id);

    // Get the latest request
    if (requests.length === 0) {
      console.log('No clearance request found for student');
      return null;
    }

    const request = requests[requests.length - 1];

    console.log('Student request loaded:', {
      id: request.id,
      currentStage: request.currentStage,
      status: request.status,
      controlNumber: request.convocation?.controlNumber,
      requestedAt: request.convocation?.controlNumberRequestedAt
    });

    return request;
  }

  // =====================================================
  // CHECK IF CONVOCATION IS APPROVED
  // =====================================================

  get isConvocationApproved(): boolean {
    const request = this.studentRequest;
    if (!request) return false;

    const convocationApproval = request.approvals.find(
        approval => approval.office === 'Convocation'
    );

    return convocationApproval?.status === 'Approved';
  }

  // =====================================================
  // CHECK IF CAN CONTINUE TO STEP 2
  // =====================================================

  get canContinueToStep2(): boolean {
    const request = this.studentRequest;
    if (!request) return false;

    // Check if Convocation is approved
    const convocationApproval = request.approvals.find(
        approval => approval.office === 'Convocation'
    );

    // Only show if approved AND we are still in Convocation stage
    return convocationApproval?.status === 'Approved' &&
        request.currentStage === 'Convocation';
  }

  // =====================================================
  // CONTINUE TO STEP 2
  // =====================================================

  continueToStep2(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.message = '';

    const request = this.studentRequest;
    if (!request) {
      this.errorMessage = 'No active clearance request found.';
      this.isLoading = false;
      return;
    }

    try {
      // Check if Convocation is approved
      const convocationApproval = request.approvals.find(
          approval => approval.office === 'Convocation'
      );

      if (!convocationApproval || convocationApproval.status !== 'Approved') {
        this.errorMessage = 'Convocation approval is required first.';
        this.isLoading = false;
        return;
      }

      // Get all requests and update the stage manually
      const allRequests = this.clearanceService.getAllRequests();
      const requestIndex = allRequests.findIndex(r => r.id === request.id);

      if (requestIndex === -1) {
        this.errorMessage = 'Request not found.';
        this.isLoading = false;
        return;
      }

      // Update the current stage to Parallel
      allRequests[requestIndex].currentStage = 'Parallel';
      allRequests[requestIndex].currentOffice = undefined;

      // Save back to storage
      const storage = new (this.clearanceService as any).storage.constructor();
      storage.save('udsm-clearance-requests', allRequests);

      // Reload data
      this.loadData();

      this.notificationService.createNotification(
          request.studentId,
          'Step 2 Started',
          'Convocation clearance approved! You can now proceed with other clearance offices.',
          'success'
      );

      this.message = '✅ Step 2 started successfully! Redirecting...';

      // Redirect to clearance status page after short delay
      setTimeout(() => {
        this.router.navigate(['/clearance/status']);
      }, 1500);

    } catch (error: any) {
      console.error('Error continuing to step 2:', error);
      this.errorMessage = 'Failed to continue to Step 2. Please try again.';
      this.isLoading = false;
    } finally {
      this.isLoading = false;
    }
  }

  // =====================================================
  // CHECK IF CONTROL NUMBER WAS REQUESTED
  // =====================================================

  get controlNumberRequested(): boolean {
    const request = this.studentRequest;
    if (!request) return false;

    // Check if convocation exists and has controlNumberRequestedAt
    return !!(request.convocation?.controlNumberRequestedAt);
  }

  // =====================================================
  // CONTROL NUMBER
  // =====================================================

  get controlNumber(): string {
    const request = this.studentRequest;
    return request?.convocation?.controlNumber ?? '';
  }

  // =====================================================
  // RECEIPT SUBMITTED
  // =====================================================

  get receiptSubmitted(): boolean {
    const request = this.studentRequest;
    return !!(request?.convocation?.receiptSubmittedAt);
  }

  // =====================================================
  // LOAD DATA - Student only
  // =====================================================

  loadData(): void {
    // If staff, redirect
    if (this.isOfficer) {
      this.router.navigate(['/convocation/dashboard']);
      return;
    }

    this.isLoading = true;

    // For students, just trigger a reload
    const user = this.currentUser;
    if (user) {
      this.clearanceService.getStudentRequests(user.id);
    }

    this.isLoading = false;
    console.log('Student data reloaded successfully');
  }

  // =====================================================
  // REFRESH DATA - Student only
  // =====================================================

  refreshData(): void {
    // If staff, redirect
    if (this.isOfficer) {
      this.router.navigate(['/convocation/dashboard']);
      return;
    }

    console.log('Refreshing student data...');
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
    this.errorMessage = '';
    this.message = '';

    const request = this.studentRequest;

    if (!request) {
      this.errorMessage = 'No active clearance request was found.';
      return;
    }

    // Check if control number already requested
    if (request.convocation?.controlNumberRequestedAt) {
      this.message = 'Your control number has already been requested.';
      return;
    }

    // Check if control number already issued
    if (request.convocation?.controlNumber) {
      this.message = 'You already have a control number: ' + request.convocation.controlNumber;
      return;
    }

    // Initialize convocation object if it doesn't exist
    if (!request.convocation) {
      request.convocation = {};
    }

    // Request the control number
    this.clearanceService.requestControlNumber(request.id);

    // Reload data after action
    this.loadData();

    this.message = 'Control number requested. Please wait for Convocation to issue your control number.';
  }

  // =====================================================
  // FILE SELECTED
  // =====================================================

  onFileSelected(event: Event): void {
    this.errorMessage = '';

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.selectedFileName = '';
    this.form.controls.file.setValue(null);

    if (!file) {
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png'
    ];

    if (!allowedTypes.includes(file.type)) {
      this.errorMessage = 'Please upload a PDF, JPG, JPEG or PNG receipt.';
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = 'Receipt must not exceed 5 MB.';
      input.value = '';
      return;
    }

    this.selectedFileName = file.name;
    this.form.controls.file.setValue(file);
  }

  // =====================================================
  // SUBMIT RECEIPT - Student only
  // =====================================================

  submit(): void {
    this.errorMessage = '';
    this.message = '';
    this.isLoading = true;

    const user = this.currentUser;

    if (!user) {
      this.router.navigate(['/login']);
      this.isLoading = false;
      return;
    }

    const request = this.studentRequest;

    if (!request) {
      this.errorMessage = 'No active clearance request was found.';
      this.isLoading = false;
      return;
    }

    // The student must have a control number first
    if (!this.controlNumber) {
      this.errorMessage = 'Please wait for Convocation to issue your control number.';
      this.isLoading = false;
      return;
    }

    const file = this.form.controls.file.value;

    if (!file) {
      this.errorMessage = 'Please upload your payment receipt.';
      this.isLoading = false;
      return;
    }

    this.documentService
        .uploadDocument(
            {
              studentId: user.id,
              fileName: file.name,
              fileType: 'Convocation Payment Receipt',
              fileSize: file.size,
              description: `Payment receipt for control number ${this.controlNumber}`
            },
            file
        )
        .subscribe({
          next: () => {
            this.clearanceService.submitConvocationReceipt(
                request.id,
                file.name
            );

            // Reload data after submission
            this.loadData();

            this.notificationService.createNotification(
                user.id,
                'Payment receipt submitted',
                'Your payment receipt has been submitted to Convocation for verification.',
                'success'
            );

            this.message = 'Payment receipt submitted successfully.';
            this.form.controls.file.setValue(null);
            this.selectedFileName = '';

            // Clear the file input
            const input = document.getElementById('receipt-upload') as HTMLInputElement;
            if (input) {
              input.value = '';
            }

            this.isLoading = false;
          },
          error: (error) => {
            console.error('Upload error:', error);
            this.errorMessage = 'Failed to upload the receipt. Please try again.';
            this.isLoading = false;
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