import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';

import {
  ClearanceRequest,
  ClearanceOffice
} from '../../core/models/clearance.model';


interface ProcessStep {

  number: number;

  label: string;

  office:
    | ClearanceOffice
    | 'Clearance Offices';

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

  private readonly authService =
    inject(AuthService);

  private readonly clearanceService =
    inject(ClearanceService);


  // =====================================================
  // CURRENT STUDENT REQUEST
  // =====================================================

  get request(): ClearanceRequest | null {

    const user =
      this.authService.getCurrentUser();

    if (!user) {
      return null;
    }

    const requests =
      this.clearanceService
        .getStudentRequests(user.id);

    return requests.length
      ? requests[requests.length - 1]
      : null;
  }


  // =====================================================
  // CURRENT STUDENT
  // =====================================================

  get student() {

    return this.authService
      .getCurrentUser();

  }


  // =====================================================
  // SEVEN CLEARANCE OFFICES
  // =====================================================

  readonly officeList:
    ClearanceOffice[] = [

      'Games Coach',

      'Hall Warden',

      'USAB',

      'DARUSO',

      'Library',

      'Dean of Students',

      'Smart Card'

    ];


  // =====================================================
  // GET OFFICE APPROVAL
  // =====================================================

  getApproval(
    office: ClearanceOffice
  ) {

    return this.request
      ?.approvals
      .find(
        approval =>
          approval.office === office
      )
      ?? null;

  }


  // =====================================================
  // GET OFFICE STATUS
  // =====================================================

  getOfficeStatus(
    office: ClearanceOffice
  ): string {

    return (
      this.getApproval(office)
        ?.status
      ?? 'Pending'
    );

  }


  // =====================================================
  // GET REJECTION COMMENT
  // =====================================================

  getRejectionReason(
    office: ClearanceOffice
  ): string {

    const approval =
      this.getApproval(office);

    if (
      !approval ||
      approval.status !== 'Rejected'
    ) {

      return '';

    }

    return approval.comment ?? '';

  }


  // =====================================================
  // REVIEWED BY
  // =====================================================

  getReviewedBy(
    office: ClearanceOffice
  ): string {

    return (
      this.getApproval(office)
        ?.reviewedBy
      ?? ''
    );

  }


  // =====================================================
  // REVIEWED AT
  // =====================================================

  getReviewedAt(
    office: ClearanceOffice
  ): string {

    return (
      this.getApproval(office)
        ?.reviewedAt
      ?? ''
    );

  }


  // =====================================================
  // ALL SEVEN APPROVED
  // =====================================================

  get allClearanceOfficesApproved(): boolean {

    const request =
      this.request;

    if (!request) {
      return false;
    }

    return this.officeList.every(
      office =>
        this.getOfficeStatus(office)
        === 'Approved'
    );

  }


  // =====================================================
  // CURRENT STEP NUMBER
  // =====================================================

  get currentStepNumber(): number {

    const request =
      this.request;

    if (!request) {
      return 0;
    }

    if (
      request.status === 'Completed'
    ) {

      return 5;

    }

    switch (
      request.currentStage
    ) {

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

    const request =
      this.request;

    if (!request) {

      return 'No clearance request';

    }

    if (
      request.status === 'Completed'
    ) {

      return 'Clearance completed';

    }

    if (
      request.status === 'Rejected'
    ) {

      const rejectedOffice =
        this.officeList.find(
          office =>
            this.getOfficeStatus(office)
            === 'Rejected'
        );

      if (rejectedOffice) {

        return `${rejectedOffice} — Action Required`;

      }

      const rejectedStage =
        request.approvals.find(
          approval =>
            approval.status === 'Rejected'
        );

      if (rejectedStage) {

        return `${rejectedStage.office} — Action Required`;

      }

      return 'Clearance requires action';

    }

    switch (
      request.currentStage
    ) {

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

    const request =
      this.request;

    if (!request) {

      return [];

    }

    const steps:
      ProcessStep[] = [];


    // ===================================================
    // STEP 1 — CONVOCATION
    // ===================================================

    let convocationStatus =
      this.getApproval(
        'Convocation'
      )?.status
      ?? 'Pending';


    if (
      request.currentStage === 'Parallel' ||
      request.currentStage === 'Department' ||
      request.currentStage === 'Principal' ||
      request.currentStage === 'Finance' ||
      request.status === 'Completed'
    ) {

      convocationStatus =
        'Approved';

    }


    steps.push({

      number: 1,

      label: 'Convocation',

      office: 'Convocation',

      detail:
        'Request your control number, make payment and submit your receipt.',

      status:
        convocationStatus

    });


    // ===================================================
    // STEP 2 — SEVEN CLEARANCE OFFICES
    // ===================================================

    let officesStatus =
      this.allClearanceOfficesApproved
        ? 'Approved'
        : 'Pending';


    if (
      request.currentStage === 'Department' ||
      request.currentStage === 'Principal' ||
      request.currentStage === 'Finance' ||
      request.status === 'Completed'
    ) {

      officesStatus =
        'Approved';

    }


    steps.push({

      number: 2,

      label: 'Clearance Offices',

      office: 'Clearance Offices',

      detail:
        'Games Coach, Hall Warden, USAB, DARUSO, Library, Dean of Students and Smart Card.',

      status:
        officesStatus

    });


    // ===================================================
    // STEP 3 — DEPARTMENT
    // ===================================================

    let departmentStatus =
      this.getApproval(
        'Department'
      )?.status
      ?? 'Pending';


    if (
      request.currentStage === 'Principal' ||
      request.currentStage === 'Finance' ||
      request.status === 'Completed'
    ) {

      departmentStatus =
        'Approved';

    }


    steps.push({

      number: 3,

      label: 'Department',

      office: 'Department',

      detail:
        'Department clearance approval.',

      status:
        departmentStatus

    });


    // ===================================================
    // STEP 4 — PRINCIPAL
    // ===================================================

    let principalStatus =
      this.getApproval(
        'Principal'
      )?.status
      ?? 'Pending';


    if (
      request.currentStage === 'Finance' ||
      request.status === 'Completed'
    ) {

      principalStatus =
        'Approved';

    }


    steps.push({

      number: 4,

      label: 'Principal',

      office: 'Principal',

      detail:
        'Principal clearance approval.',

      status:
        principalStatus

    });


    // ===================================================
    // STEP 5 — FINANCE
    // ===================================================

    let financeStatus =
      this.getApproval(
        'Finance'
      )?.status
      ?? 'Pending';


    if (
      request.status === 'Completed'
    ) {

      financeStatus =
        'Approved';

    }


    steps.push({

      number: 5,

      label: 'Finance',

      office: 'Finance',

      detail:
        'Final financial clearance approval.',

      status:
        financeStatus

    });


    return steps;

  }


  // =====================================================
  // OFFICE DETAIL
  // =====================================================

  getOfficeDetail(
    office: ClearanceOffice
  ): string {

    const approval =
      this.getApproval(office);

    if (!approval) {

      return 'Waiting for staff review';

    }

    if (
      approval.status === 'Approved'
    ) {

      return 'Approved by responsible staff';

    }

    if (
      approval.status === 'Rejected'
    ) {

      return 'Rejected — view the reason below';

    }

    return 'Waiting for staff review';

  }


  // =====================================================
  // TYPE CHECK
  // =====================================================

  isClearanceOffice(
    office:
      ClearanceOffice
      | 'Clearance Offices'
  ): office is ClearanceOffice {

    return this.officeList
      .includes(office as ClearanceOffice);

  }

}