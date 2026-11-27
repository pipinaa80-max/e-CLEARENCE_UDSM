// convocation.component.ts — Student Step 1 (Convocation Payment Control Number)
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { ConvocationService } from '../../core/services/convocation.service';
import { ClearanceRequest } from '../../core/models/clearance.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';
import { StudentSidebarComponent } from '../../shared/components/student-sidebar/student-sidebar';

@Component({
  selector: 'app-convocation',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    DashboardHeaderComponent,
    StudentSidebarComponent
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

  sidebarOpen = false;
  isFetching = true;
  isSubmitting = false;
  message = '';
  errorMessage = '';

  request: ClearanceRequest | null = null;

  form = this.fb.nonNullable.group({
    controlNumber: [
      '',
      [Validators.required, Validators.pattern(/^[A-Za-z0-9-]{4,40}$/)]
    ]
  });

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get studentRequest(): ClearanceRequest | null {
    return this.request;
  }

  get convocationApproval() {
    return this.studentRequest?.approvals?.find(
      approval => approval.office === 'Convocation'
    ) ?? null;
  }

  get isConvocationApproved(): boolean {
    return this.convocationApproval?.status === 'Approved';
  }

  get isConvocationRejected(): boolean {
    return this.convocationApproval?.status === 'Rejected';
  }

  get rejectionComment(): string {
    return this.convocationApproval?.comment || 'Please verify and resubmit a valid payment control number.';
  }

  get submittedControlNumber(): string {
    return (
      this.studentRequest?.convocation?.submittedControlNumber ||
      this.studentRequest?.convocation?.controlNumber ||
      ''
    );
  }

  get isControlNumberValid(): boolean {
    const val = this.form.controls.controlNumber.value.trim();
    return /^[A-Za-z0-9-]{4,40}$/.test(val);
  }

  ngOnInit(): void {
    const user = this.currentUser;
    if (!user || user.role !== 'Student') {
      this.router.navigate(['/login']);
      return;
    }

    // Show cached request immediately if present, then always sync authoritative state from backend
    this.loadLocalCache();
    this.fetchLiveRequest();
  }

  private loadLocalCache(): void {
    const user = this.currentUser;
    if (user && user.role === 'Student') {
      const requests = this.clearanceService.getStudentRequests(user.id);
      this.request = requests.length ? requests[requests.length - 1] : null;
    } else {
      this.request = null;
    }
  }

  private fetchLiveRequest(): void {
    this.isFetching = true;
    this.clearanceService.fetchMyRequest().subscribe({
      next: (serverRequest) => {
        if (serverRequest) {
          this.request = serverRequest;
        } else {
          this.loadLocalCache();
        }
        this.isFetching = false;
      },
      error: () => {
        this.loadLocalCache();
        this.isFetching = false;
      }
    });
  }

  submit(): void {
    this.message = '';
    this.errorMessage = '';

    const user = this.currentUser;
    const req = this.studentRequest;
    const controlNum = this.form.controls.controlNumber.value.trim();

    if (!user || !req) {
      this.errorMessage = 'No active clearance request found. Please start your clearance request first.';
      return;
    }

    if (!/^[A-Za-z0-9-]{4,40}$/.test(controlNum)) {
      this.errorMessage = 'Enter a valid payment control number (4 to 40 letters, numbers, or hyphens).';
      return;
    }

    this.isSubmitting = true;

    this.convocationService.submitReceipt({
      studentId: user.id,
      controlNumber: controlNum,
      receiptNumber: `CN-${controlNum}`,
      paymentDate: new Date().toISOString().slice(0, 10)
    }).subscribe({
      next: () => {
        this.clearanceService.submitConvocationReceipt(req.id, `Control Number: ${controlNum}`, controlNum);
        this.clearanceService.fetchMyRequest().subscribe({
          next: (updated) => {
            if (updated) this.request = updated;
          }
        });
        this.notificationService.getStudentNotifications().subscribe();
        this.toastService.success(
          'Control Number Submitted',
          'Convocation Step 1 complete! Proceeding to Step 2 (Parallel Offices).'
        );
        this.message = 'Control number submitted successfully. Proceeding to Step 2...';
        this.isSubmitting = false;
        this.router.navigate(['/clearance/status']);
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err?.error?.message || 'Unable to submit payment control number. Please check your connection and try again.';
        this.errorMessage = msg;
        this.toastService.error('Submission Failed', msg);
      }
    });
  }

  continueToStep2(): void {
    this.router.navigate(['/clearance/status']);
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }
}
