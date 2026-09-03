// clearance-status.component.ts - Fixed for parallel offices
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';

import {
  ClearanceRequest,
  ClearanceOffice
} from '../../core/models/clearance.model';

interface ProcessStep {
  number: number;
  label: string;
  office: ClearanceOffice | 'Clearance Offices';
  detail: string;
  status: string;
}

@Component({
  selector: 'app-clearance-status',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './status.html',
  styleUrl: './status.css'
})
export class ClearanceStatusComponent {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // =====================================================
  // CURRENT STUDENT REQUEST
  // =====================================================

  get request(): ClearanceRequest | null {
    const user = this.authService.getCurrentUser();

    if (!user) {
      return null;
    }

    const requests = this.clearanceService.getStudentRequests(user.id);
    return requests.length ? requests[requests.length - 1] : null;
  }

  // =====================================================
  // CURRENT STUDENT
  // =====================================================

  get student() {
    return this.authService.getCurrentUser();
  }

  // =====================================================
  // SEVEN CLEARANCE OFFICES
  // =====================================================

  get officeList(): ClearanceOffice[] {
    return this.clearanceService.getClearanceOffices(this.request?.college ?? '');
  }

  // =====================================================
  // GET OFFICE APPROVAL
  // =====================================================

  getApproval(office: ClearanceOffice) {
    return this.request?.approvals.find(approval => approval.office === office) ?? null;
  }

  // =====================================================
  // GET OFFICE STATUS
  // =====================================================

  getOfficeStatus(office: ClearanceOffice): string {
    return this.getApproval(office)?.status ?? 'Pending';
  }

  // =====================================================
  // GET REJECTION COMMENT
  // =====================================================

  getRejectionReason(office: ClearanceOffice): string {
    const approval = this.getApproval(office);
    if (!approval || approval.status !== 'Rejected') {
      return '';
    }
    return approval.comment ?? '';
  }

  // =====================================================
  // REVIEWED BY
  // =====================================================

  getReviewedBy(office: ClearanceOffice): string {
    return this.getApproval(office)?.reviewedBy ?? '';
  }

  // =====================================================
  // CHECK IF CONVOCATION IS APPROVED
  // =====================================================

  get isConvocationApproved(): boolean {
    const request = this.request;
    if (!request) return false;

    const convocationApproval = request.approvals.find(
        approval => approval.office === 'Convocation'
    );

    return convocationApproval?.status === 'Approved';
  }

  // =====================================================
  // ALL SEVEN APPROVED - FIXED
  // =====================================================

  get allClearanceOfficesApproved(): boolean {
    const request = this.request;
    if (!request) return false;

    // Check if all offices required by this student's college are approved
    const allApproved = this.officeList.every(office => {
      const status = this.getOfficeStatus(office);
      return status === 'Approved';
    });

    console.log('All clearance offices approved:', allApproved);
    return allApproved;
  }

  // =====================================================
  // CHECK IF CAN CONTINUE TO NEXT STAGE - FIXED
  // =====================================================

  get canContinueToNextStage(): boolean {
    const request = this.request;
    if (!request) return false;

    // For Convocation stage - check if approved
    if (request.currentStage === 'Convocation') {
      const canContinue = this.isConvocationApproved;
      console.log('Can continue from Convocation:', canContinue);
      return canContinue;
    }

    // For Parallel stage - check if all offices approved
    if (request.currentStage === 'Parallel') {
      const canContinue = this.allClearanceOfficesApproved;
      console.log('Can continue from Parallel:', canContinue);
      return canContinue;
    }

    return false;
  }

  // =====================================================
  // GET NEXT STAGE NAME
  // =====================================================

  getNextStageName(): string {
    const request = this.request;
    if (!request) return '';

    switch (request.currentStage) {
      case 'Convocation':
        return 'Step 2: Clearance Offices';
      case 'Parallel':
        return 'Step 3: Department';
      case 'Department':
        return 'Step 4: Principal';
      case 'Principal':
        return 'Step 5: Finance';
      case 'Finance':
        return 'Clearance Confirmation';
      default:
        return '';
    }
  }

  canAdvanceFromCurrentStage(): boolean {
    const request = this.request;
    if (!request) return false;

    if (request.currentStage === 'Convocation') {
      return this.isConvocationApproved;
    }

    if (request.currentStage === 'Parallel') {
      return this.allClearanceOfficesApproved;
    }

    if (
        request.currentStage === 'Department' ||
        request.currentStage === 'Principal' ||
        request.currentStage === 'Finance'
    ) {
      return this.getOfficeStatus(request.currentStage) === 'Approved';
    }

    return false;
  }

  // =====================================================
  // CONTINUE TO NEXT STAGE - FIXED
  // =====================================================

  continueToNextStage(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request = this.request;
    if (!request) {
      this.errorMessage = 'No active clearance request found.';
      this.isLoading = false;
      return;
    }

    try {
      // Get all requests
      const allRequests = this.clearanceService.getAllRequests();
      const requestIndex = allRequests.findIndex(r => r.id === request.id);

      if (requestIndex === -1) {
        this.errorMessage = 'Request not found.';
        this.isLoading = false;
        return;
      }

      // Determine next stage
      let nextStage: string = '';
      let nextOffice: ClearanceOffice | undefined = undefined;

      if (request.currentStage === 'Convocation') {
        nextStage = 'Parallel';
        nextOffice = undefined;
      } else if (request.currentStage === 'Parallel') {
        // Check if all offices are approved before proceeding
        if (!this.allClearanceOfficesApproved) {
          this.errorMessage = 'All clearance offices must approve first.';
          this.isLoading = false;
          return;
        }
        nextStage = 'Department';
        nextOffice = 'Department';
      } else if (request.currentStage === 'Department') {
        if (this.getOfficeStatus('Department') !== 'Approved') {
          this.errorMessage = 'Department approval is required first.';
          this.isLoading = false;
          return;
        }
        nextStage = 'Principal';
        nextOffice = 'Principal';
      } else if (request.currentStage === 'Principal') {
        if (this.getOfficeStatus('Principal') !== 'Approved') {
          this.errorMessage = 'Principal approval is required first.';
          this.isLoading = false;
          return;
        }
        nextStage = 'Finance';
        nextOffice = 'Finance';
      } else if (request.currentStage === 'Finance') {
        if (this.getOfficeStatus('Finance') !== 'Approved') {
          this.errorMessage = 'Finance approval is required first.';
          this.isLoading = false;
          return;
        }
        nextStage = 'Completed';
        nextOffice = undefined;
        allRequests[requestIndex].status = 'Completed';
      } else {
        this.errorMessage = 'Cannot continue from current stage.';
        this.isLoading = false;
        return;
      }

      // Update the request
      allRequests[requestIndex].currentStage = nextStage as any;
      allRequests[requestIndex].currentOffice = nextOffice;

      // Save back to storage
      const storage = new (this.clearanceService as any).storage.constructor();
      storage.save('udsm-clearance-requests', allRequests);

      // Reload data
      this.loadData();

      this.successMessage = `✅ ${this.getNextStageName()} started successfully!`;

      // Show notification
      this.notificationService.createNotification(
          request.studentId,
          'Next Stage Started',
          `You have successfully moved to ${this.getNextStageName()}.`,
          'success'
      );

      setTimeout(() => {
        this.successMessage = '';
        // Refresh the page data
        window.location.reload();
      }, 3000);

    } catch (error: any) {
      console.error('Error continuing to next stage:', error);
      this.errorMessage = 'Failed to continue to next stage. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  // =====================================================
  // LOAD DATA
  // =====================================================

  loadData(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.clearanceService.getStudentRequests(user.id);
    }
  }

  goBack(): void {
    window.history.back();
  }

  // =====================================================
  // CURRENT STEP NUMBER
  // =====================================================

  get currentStepNumber(): number {
    const request = this.request;
    if (!request) return 0;

    if (request.status === 'Completed') {
      return 5;
    }

    switch (request.currentStage) {
      case 'Convocation':
        return 1;
      case 'Parallel':
        return 2;
      case 'Department':
        return 3;
      case 'Principal':
        return 4;
      case 'Finance':
        return 5;
      case 'Completed':
        return 5;
      default:
        return 1;
    }
  }

  // =====================================================
  // CURRENT STAGE LABEL
  // =====================================================

  get currentStageLabel(): string {
    const request = this.request;

    if (!request) {
      return 'No clearance request';
    }

    if (request.status === 'Completed') {
      return 'Clearance completed';
    }

    if (request.status === 'Rejected') {
      const rejectedOffice = this.officeList.find(
          office => this.getOfficeStatus(office) === 'Rejected'
      );

      if (rejectedOffice) {
        return `${rejectedOffice} — Action Required`;
      }

      const rejectedStage = request.approvals.find(
          approval => approval.status === 'Rejected'
      );

      if (rejectedStage) {
        return `${rejectedStage.office} — Action Required`;
      }

      return 'Clearance requires action';
    }

    switch (request.currentStage) {
      case 'Convocation':
        return 'Convocation';
      case 'Parallel':
        return 'Clearance Offices';
      case 'Department':
        return 'Department';
      case 'Principal':
        return 'Principal';
      case 'Finance':
        return 'Finance';
      case 'Completed':
        return 'Clearance completed';
      default:
        return 'Clearance';
    }
  }

  // =====================================================
  // FIVE MAIN STEPS
  // =====================================================

  get processSteps(): ProcessStep[] {
    const request = this.request;

    if (!request) {
      return [];
    }

    const steps: ProcessStep[] = [];

    // STEP 1 — CONVOCATION
    let convocationStatus = this.getApproval('Convocation')?.status ?? 'Pending';

    if (
        request.currentStage === 'Parallel' ||
        request.currentStage === 'Department' ||
        request.currentStage === 'Principal' ||
        request.currentStage === 'Finance' ||
        request.status === 'Completed'
    ) {
      convocationStatus = 'Approved';
    }

    steps.push({
      number: 1,
      label: 'Convocation',
      office: 'Convocation',
      detail: 'Request your control number, make payment and submit your receipt.',
      status: convocationStatus
    });

    // STEP 2 — SEVEN CLEARANCE OFFICES
    let officesStatus = this.allClearanceOfficesApproved ? 'Approved' : 'Pending';

    if (
        request.currentStage === 'Department' ||
        request.currentStage === 'Principal' ||
        request.currentStage === 'Finance' ||
        request.status === 'Completed'
    ) {
      officesStatus = 'Approved';
    }

    steps.push({
      number: 2,
      label: 'Clearance Offices',
      office: 'Clearance Offices',
      detail: this.officeList.join(', ') + '.',
      status: officesStatus
    });

    // STEP 3 — DEPARTMENT
    let departmentStatus = this.getApproval('Department')?.status ?? 'Pending';

    if (
        request.currentStage === 'Principal' ||
        request.currentStage === 'Finance' ||
        request.status === 'Completed'
    ) {
      departmentStatus = 'Approved';
    }

    steps.push({
      number: 3,
      label: 'Department',
      office: 'Department',
      detail: 'Department clearance approval.',
      status: departmentStatus
    });

    // STEP 4 — PRINCIPAL
    let principalStatus = this.getApproval('Principal')?.status ?? 'Pending';

    if (
        request.currentStage === 'Finance' ||
        request.status === 'Completed'
    ) {
      principalStatus = 'Approved';
    }

    steps.push({
      number: 4,
      label: 'Principal',
      office: 'Principal',
      detail: 'Principal clearance approval.',
      status: principalStatus
    });

    // STEP 5 — FINANCE
    let financeStatus = this.getApproval('Finance')?.status ?? 'Pending';

    if (request.status === 'Completed') {
      financeStatus = 'Approved';
    }

    steps.push({
      number: 5,
      label: 'Finance',
      office: 'Finance',
      detail: 'Final financial clearance approval.',
      status: financeStatus
    });

    return steps;
  }

  // =====================================================
  // OFFICE DETAIL
  // =====================================================

  getOfficeDetail(office: ClearanceOffice): string {
    const approval = this.getApproval(office);

    if (!approval) {
      return 'Waiting for staff review';
    }

    if (approval.status === 'Approved') {
      return 'Approved by responsible staff';
    }

    if (approval.status === 'Rejected') {
      return 'Rejected — view the reason below';
    }

    return 'Waiting for staff review';
  }

  // =====================================================
  // OFFICE ROUTES
  // =====================================================

  getOfficeRoute(office: string): string {
    const map: Record<string, string> = {
      'Convocation': '/convocation',
      'Games Coach': '/games_coach',
      'Hall Warden': '/hall_warden',
      'USAB': '/usab',
      'DARUSO': '/daruso',
      'Library': '/dashboard/library',
      'Dean of Students': '/dean_of_students',
      'Smart Card': '/smart_card',
      'Workshop': '/dashboard/workshop',
      'Laboratory': '/dashboard/laboratory',
      'Department': '/department/dashboard',
      'Principal': '/principal',
      'Finance': '/dashboard/finance'
    };
    return map[office] || '/clearance/status';
  }

  // =====================================================
  // TYPE CHECK
  // =====================================================

  isClearanceOffice(office: ClearanceOffice | 'Clearance Offices'): office is ClearanceOffice {
    return this.officeList.includes(office as ClearanceOffice);
  }
}