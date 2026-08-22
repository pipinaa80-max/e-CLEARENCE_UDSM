// convocation.component.ts
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
  comment = '';
  isLoading = false;

  // Cached requests for officer view
  private cachedRequests: ClearanceRequest[] = [];

  // =====================================================
  // CURRENT USER
  // =====================================================

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  // =====================================================
  // OFFICER CHECK
  // =====================================================

  get isOfficer(): boolean {
    return this.currentUser?.role === 'Convocation';
  }

  // =====================================================
  // STUDENT REQUEST - RELOADED ON EACH ACCESS
  // =====================================================

  get studentRequest(): ClearanceRequest | null {
    const user = this.currentUser;

    if (!user) {
      return null;
    }

    // Force reload from storage
    const requests = this.clearanceService.getStudentRequests(user.id);
    const request = requests.find(req => req.currentStage === 'Convocation') ?? null;

    console.log('Student request loaded:', request?.id, request?.status);
    return request;
  }

  // =====================================================
  // CONVOCATION REQUESTS - RELOADED ON EACH ACCESS
  // =====================================================

  get requests(): ClearanceRequest[] {
    // Force reload from storage
    this.cachedRequests = this.clearanceService.getRequestsForOffice('Convocation');
    console.log('Convocation requests loaded:', this.cachedRequests.length);
    return this.cachedRequests;
  }

  // =====================================================
  // INIT - LOAD DATA
  // =====================================================

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;

    // Clear caches
    this.cachedRequests = [];

    // Force data reload
    if (this.isOfficer) {
      this.cachedRequests = this.clearanceService.getRequestsForOffice('Convocation');
    } else {
      // For students, just trigger a reload
      const user = this.currentUser;
      if (user) {
        this.clearanceService.getStudentRequests(user.id);
      }
    }

    this.isLoading = false;
    console.log('Data reloaded successfully');
  }

  // =====================================================
  // REFRESH DATA - Called from template
  // =====================================================

  refreshData(): void {
    console.log('Refreshing data...');
    this.loadData();
    this.message = 'Data refreshed successfully.';

    // Clear message after 3 seconds
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

    if (request.convocation?.controlNumberRequestedAt) {
      this.message = 'Your control number has already been requested.';
      return;
    }

    this.clearanceService.requestControlNumber(request.id);

    // Reload data after action
    this.loadData();

    this.message = 'Control number requested. Please wait for Convocation to issue your control number.';
  }

  // =====================================================
  // CONTROL NUMBER
  // =====================================================

  get controlNumber(): string {
    const request = this.studentRequest;
    return request?.convocation?.controlNumber ?? '';
  }

  // =====================================================
  // CONTROL NUMBER REQUESTED
  // =====================================================

  get controlNumberRequested(): boolean {
    const request = this.studentRequest;
    return !!(request?.convocation?.controlNumberRequestedAt);
  }

  // =====================================================
  // RECEIPT SUBMITTED
  // =====================================================

  get receiptSubmitted(): boolean {
    const request = this.studentRequest;
    return !!(request?.convocation?.receiptSubmittedAt);
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
  // SUBMIT RECEIPT
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
  // STAFF — ISSUE CONTROL NUMBER
  // =====================================================

  issueControlNumber(request: ClearanceRequest): void {
    this.errorMessage = '';
    this.message = '';

    if (request.convocation?.controlNumber) {
      this.message = 'This request already has a control number.';
      return;
    }

    const controlNumber = window.prompt(
        'Enter the control number for this student:'
    );

    if (!controlNumber?.trim()) {
      this.errorMessage = 'Please enter a control number.';
      return;
    }

    this.clearanceService.issueControlNumber(
        request.id,
        controlNumber.trim()
    );

    // Reload data after action
    this.loadData();

    this.notificationService.createNotification(
        request.studentId,
        'Control number issued',
        `Convocation has issued your control number: ${controlNumber.trim()}`,
        'success'
    );

    this.message = 'Control number issued successfully.';
  }

  // =====================================================
  // STAFF — APPROVE
  // =====================================================

  approve(request: ClearanceRequest): void {
    this.errorMessage = '';
    this.message = '';
    this.isLoading = true;

    const staff = this.currentUser;

    if (!staff) {
      this.isLoading = false;
      return;
    }

    if (!request.convocation?.receiptSubmittedAt) {
      this.errorMessage = 'The student must submit a payment receipt before approval.';
      this.isLoading = false;
      return;
    }

    this.clearanceService.approveRequest(
        request.id,
        'Convocation',
        staff.fullName
    );

    // Reload data after action
    this.loadData();

    this.notificationService.createNotification(
        request.studentId,
        'Convocation clearance approved',
        'Your payment receipt has been verified. You can now continue to the clearance offices.',
        'success'
    );

    this.message = 'Request approved successfully.';
    this.isLoading = false;
  }

  // =====================================================
  // STAFF — REJECT
  // =====================================================

  reject(request: ClearanceRequest): void {
    this.errorMessage = '';
    this.message = '';
    this.isLoading = true;

    const staff = this.currentUser;

    if (!staff) {
      this.isLoading = false;
      return;
    }

    if (!this.comment.trim()) {
      this.errorMessage = 'Please enter a comment before rejecting the request.';
      this.isLoading = false;
      return;
    }

    this.clearanceService.rejectRequest(
        request.id,
        'Convocation',
        staff.fullName,
        this.comment.trim()
    );

    // Reload data after action
    this.loadData();

    this.notificationService.createNotification(
        request.studentId,
        'Convocation clearance rejected',
        this.comment.trim(),
        'warning'
    );

    this.comment = '';
    this.message = 'Request rejected and the student has been notified.';
    this.isLoading = false;
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}