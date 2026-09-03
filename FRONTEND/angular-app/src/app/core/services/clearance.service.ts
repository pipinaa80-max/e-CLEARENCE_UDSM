// clearance.service.ts
import { Injectable } from '@angular/core';

import {
  ClearanceOffice,
  ClearanceRequest
} from '../models/clearance.model';

import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class ClearanceService {

  private readonly storage = new StorageService();
  private readonly requestKey = 'udsm-clearance-requests';
  private readonly draftKey = 'udsm-clearance-drafts';

  /*
   * These seven offices work independently.
   */
  private readonly clearanceOffices: ClearanceOffice[] = [
    'Games Coach',
    'Hall Warden',
    'USAB',
    'DARUSO',
    'Library',
    'Dean of Students',
    'Smart Card'
  ];

  getClearanceOffices(college: string): ClearanceOffice[] {
    const offices = [...this.clearanceOffices];

    if (college === 'College of Engineering and Technology (CoET)') {
      offices.push('Workshop');
    }

    if (college === 'Mbeya College of Health and Allied Sciences (MCHAS)') {
      offices.push('Laboratory');
    }

    return offices;
  }

  // =====================================================
  // CREATE CLEARANCE REQUEST - ORIGINAL METHOD
  // =====================================================

  createRequest(
      studentId: string,
      college: string,
      department: string,
      programme: string
  ): ClearanceRequest {
    const request: ClearanceRequest = {
      id: crypto.randomUUID(),
      studentId,
      college,
      department,
      programme,
      requestDate: new Date().toISOString(),
      status: 'Pending',
      currentStage: 'Convocation',
      currentOffice: 'Convocation',
      approvals: [
        {
          office: 'Convocation',
          status: 'Pending'
        },
        ...this.getClearanceOffices(college).map(office => ({
          office,
          status: 'Pending' as const
        })),
        {
          office: 'Department',
          status: 'Pending'
        },
        {
          office: 'Principal',
          status: 'Pending'
        },
        {
          office: 'Finance',
          status: 'Pending'
        }
      ]
    };

    const requests = this.getAllRequests();
    requests.push(request);
    this.storage.save(this.requestKey, requests);

    return request;
  }

  // =====================================================
  // CREATE CLEARANCE REQUEST - NEW METHOD WITH FULL DATA
  // =====================================================

  createFullRequest(requestData: {
    studentId: string;
    studentName?: string;
    registrationNumber?: string;
    college: string;
    department: string;
    programme: string;
    hall?: string;
    roomNumber?: string;
    residenceType?: 'Off Campus' | 'Hostel Dwellers';
    residenceEvidence?: string;
    sponsor?: string;
    photo?: string;
    clearanceType?: string;
    remarks?: string;
  }): ClearanceRequest {

    if (this.getStudentRequests(requestData.studentId).length > 0) {
      throw new Error('You already have a submitted clearance request.');
    }

    const request: ClearanceRequest = {
      id: crypto.randomUUID(),
      studentId: requestData.studentId,
      studentName: requestData.studentName || '',
      registrationNumber: requestData.registrationNumber || '',
      college: requestData.college,
      department: requestData.department,
      programme: requestData.programme,
      hall: requestData.hall || '',
      roomNumber: requestData.roomNumber || '',
      residenceType: requestData.residenceType,
      residenceEvidence: requestData.residenceEvidence || '',
      sponsor: requestData.sponsor || '',
      photo: requestData.photo || '',
      clearanceType: requestData.clearanceType || 'Graduation Clearance',
      remarks: requestData.remarks || '',
      requestDate: new Date().toISOString(),
      status: 'Pending',
      currentStage: 'Convocation',
      currentOffice: 'Convocation',
      approvals: [
        {
          office: 'Convocation',
          status: 'Pending'
        },
        ...this.getClearanceOffices(requestData.college).map(office => ({
          office,
          status: 'Pending' as const
        })),
        {
          office: 'Department',
          status: 'Pending'
        },
        {
          office: 'Principal',
          status: 'Pending'
        },
        {
          office: 'Finance',
          status: 'Pending'
        }
      ]
    };

    const requests = this.getAllRequests();
    requests.push(request);
    this.storage.save(this.requestKey, requests);

    return request;
  }

  // =====================================================
  // SAVE DRAFT
  // =====================================================

  saveDraft(
      studentId: string,
      clearanceType: string,
      remarks: string,
      academicProfile?: {
        college?: string;
        department?: string;
        programme?: string;
      }
  ): void {
    const drafts = this.storage.get<Record<string, any>>(this.draftKey) ?? {};
    drafts[studentId] = {
      clearanceType,
      remarks,
      academicProfile,
      savedAt: new Date().toISOString()
    };
    this.storage.save(this.draftKey, drafts);
  }

  // =====================================================
  // GET DRAFT
  // =====================================================

  getDraft(studentId: string): any | null {
    const drafts = this.storage.get<Record<string, any>>(this.draftKey) ?? {};
    return drafts[studentId] ?? null;
  }

  // =====================================================
  // CLEAR DRAFT
  // =====================================================

  clearDraft(studentId: string): void {
    const drafts = this.storage.get<Record<string, any>>(this.draftKey) ?? {};
    delete drafts[studentId];
    this.storage.save(this.draftKey, drafts);
  }

  // =====================================================
  // GET ALL REQUESTS
  // =====================================================

  getAllRequests(): ClearanceRequest[] {
    const requests = this.storage.get<ClearanceRequest[]>(this.requestKey) ?? [];
    return requests.map(request => this.normaliseRequest(request));
  }

  // =====================================================
  // GET REQUEST
  // =====================================================

  getRequest(id: string): ClearanceRequest | undefined {
    return this.getAllRequests().find(request => request.id === id);
  }

  // =====================================================
  // GET STUDENT REQUESTS
  // =====================================================

  getStudentRequests(studentId: string): ClearanceRequest[] {
    return this.getAllRequests().filter(request => request.studentId === studentId);
  }

  // =====================================================
  // CLEARANCE HISTORY
  // =====================================================

  getClearanceHistory(studentId: string): ClearanceRequest[] {
    return this.getStudentRequests(studentId).slice().reverse();
  }

  // =====================================================
  // CURRENT STATUS
  // =====================================================

  getClearanceStatus(studentId: string): string {
    const request = this.getStudentRequests(studentId).at(-1);

    if (!request) {
      return 'Not Requested';
    }

    if (request.status === 'Pending') {
      return `Pending - ${request.currentOffice ?? request.currentStage}`;
    }

    return request.status;
  }

  // =====================================================
  // GET APPROVALS
  // =====================================================

  getApprovalsForRequest(requestId: string) {
    return (this.getRequest(requestId)?.approvals ?? []).map(
        (approval, sequenceIndex) => ({
          ...approval,
          officeId: approval.office,
          group: this.clearanceOffices.includes(approval.office)
              ? 'parallel' as const
              : 'stage' as const,
          sequenceIndex,
          date: approval.reviewedAt
        })
    );
  }

  // =====================================================
  // GET REQUESTS FOR OFFICE
  // =====================================================

  getRequestsForOffice(
      office: ClearanceOffice,
      college?: string,
      department?: string
  ): ClearanceRequest[] {
    return this.getAllRequests().filter(request => {
      const approval = request.approvals.find(item => item.office === office);

      /*
       * Only pending requests.
       */
      if (request.status !== 'Pending' &&
          !(request.status === 'Rejected' && request.revisionOffice === office)) {
        return false;
      }

      if (approval?.status !== 'Pending' && approval?.status !== 'Rejected') {
        return false;
      }

      /*
       * Convocation only sees Convocation-stage requests.
       */
      if (office === 'Convocation') {
        return request.currentStage === 'Convocation';
      }

      /*
       * The seven clearance offices can act independently during Step 2.
       */
      if (this.getClearanceOffices(request.college).includes(office)) {
        return request.currentStage === 'Parallel';
      }

      /*
       * Department is restricted to the student's department.
       */
      if (office === 'Department') {
        return (
            request.currentStage === 'Department' &&
            request.college === college &&
            request.department === department
        );
      }

      /*
       * Principal and Finance.
       */
      return request.currentStage === office;
    });
  }

  // =====================================================
  // STEP 1 - STUDENT REQUESTS CONTROL NUMBER
  // =====================================================

  requestControlNumber(requestId: string): void {
    const request = this.getRequest(requestId);

    if (!request) {
      return;
    }

    if (request.currentStage !== 'Convocation') {
      return;
    }

    /*
     * Do not request it again if one has already been requested.
     */
    if (request.convocation?.controlNumberRequestedAt) {
      return;
    }

    request.convocation = {
      ...(request.convocation ?? {}),
      controlNumberRequestedAt: new Date().toISOString()
    };

    this.save(request);
  }

  // =====================================================
  // STEP 1 - CONVOCATION ISSUES CONTROL NUMBER
  // =====================================================

  issueControlNumber(requestId: string, controlNumber?: string): string | null {
    const request = this.getRequest(requestId);

    if (!request) {
      return null;
    }

    if (request.currentStage !== 'Convocation') {
      return null;
    }

    /*
     * If a control number already exists, return the existing number.
     */
    if (request.convocation?.controlNumber) {
      return request.convocation.controlNumber;
    }

    /*
     * Generate one if Convocation did not enter one manually.
     */
    const issuedNumber = controlNumber?.trim() || 'UDSM-' + Date.now().toString().slice(-8);

    request.convocation = {
      ...(request.convocation ?? {}),
      controlNumber: issuedNumber,
      controlNumberIssuedAt: new Date().toISOString()
    };

    this.save(request);

    return issuedNumber;
  }

  // =====================================================
  // STEP 1 - STUDENT SUBMITS PAYMENT RECEIPT
  // =====================================================

  submitConvocationReceipt(requestId: string, fileName: string): void {
    const request = this.getRequest(requestId);

    if (!request) {
      return;
    }

    if (request.currentStage !== 'Convocation') {
      return;
    }

    /*
     * Receipt cannot be submitted without a control number.
     */
    if (!request.convocation?.controlNumber) {
      return;
    }

    request.convocation = {
      ...(request.convocation ?? {}),
      receiptFileName: fileName,
      receiptSubmittedAt: new Date().toISOString()
    };

    this.save(request);
  }

  // =====================================================
  // STEP 1 - OFFICER VERIFIES PAYMENT RECEIPT
  // =====================================================

  verifyConvocationReceipt(requestId: string, officerName: string): void {
    const request = this.getRequest(requestId);

    if (!request) {
      return;
    }

    if (request.currentStage !== 'Convocation') {
      return;
    }

    /*
     * Cannot verify what doesn't exist.
     */
    if (!request.convocation?.receiptFileName) {
      return;
    }

    // We keep the receipt submitted at date, but we can add a verification date if we want
    // For now, this just serves as a state transition trigger if needed,
    // but usually Convocation approval is the final step.

    // In our logic, 'receiptSubmittedAt' is what triggers the 'Final Approval' button.
    // If the student didn't upload it but the officer physically saw it, they can use this.

    if (!request.convocation.receiptSubmittedAt) {
        request.convocation.receiptSubmittedAt = new Date().toISOString();
        request.convocation.receiptFileName = 'Verified by Officer';
    }

    this.save(request);
  }

  // =====================================================
  // APPROVE
  // =====================================================

  approveRequest(
      requestId: string,
      office: ClearanceOffice,
      staffName: string
  ): boolean {
    const request = this.getRequest(requestId);
    const approval = request?.approvals.find(item => item.office === office);

    if (!request || !approval || approval.status !== 'Pending') {
      return false;
    }

    if (office === 'Department' && request.currentStage !== 'Department') {
      return false;
    }

    /*
     * Convocation should only approve after receipt has been submitted.
     */
    if (office === 'Convocation' && !request.convocation?.receiptSubmittedAt) {
      return false;
    }

    approval.status = 'Approved';
    approval.comment = 'Approved';
    approval.reviewedBy = staffName;
    approval.reviewedAt = new Date().toISOString();

    this.moveToNextStage(request);
    this.save(request);
    return true;
  }

  // =====================================================
  // REJECT
  // =====================================================

  rejectRequest(
      requestId: string,
      office: ClearanceOffice,
      staffName: string,
      comment: string
  ): boolean {
    const request = this.getRequest(requestId);
    const approval = request?.approvals.find(item => item.office === office);

    if (!request || !approval || approval.status !== 'Pending') {
      return false;
    }

    if (office === 'Department' && request.currentStage !== 'Department') {
      return false;
    }

    if (!comment.trim()) {
      return false;
    }

    approval.status = 'Rejected';
    approval.comment = comment.trim();
    approval.reviewedBy = staffName;
    approval.reviewedAt = new Date().toISOString();

    request.status = 'Rejected';
    request.revisionOffice = office;

    this.save(request);
    return true;
  }

  resubmitRequest(
      requestId: string,
      requestData: Partial<Pick<ClearanceRequest,
          'college' | 'department' | 'programme' | 'hall' | 'roomNumber' |
          'residenceType' | 'residenceEvidence' | 'sponsor' | 'photo'>>
  ): boolean {
    const request = this.getRequest(requestId);

    if (!request || request.status !== 'Rejected' || !request.revisionOffice) {
      return false;
    }

    Object.assign(request, requestData);

    const approval = request.approvals.find(item => item.office === request.revisionOffice);
    if (!approval) return false;

    approval.status = 'Pending';
    approval.comment = undefined;
    approval.reviewedBy = undefined;
    approval.reviewedAt = undefined;
    request.status = 'Pending';
    request.currentStage = request.revisionOffice === 'Department'
        ? 'Department'
        : request.revisionOffice === 'Convocation'
            ? 'Convocation'
            : 'Parallel';
    request.currentOffice = request.revisionOffice;
    request.revisionOffice = undefined;

    this.save(request);
    return true;
  }

  // =====================================================
  // MOVE TO NEXT STAGE
  // =====================================================

  private moveToNextStage(request: ClearanceRequest): void {
    /*
     * STEP 1: Convocation → Step 2
     */
    if (request.currentStage === 'Convocation') {
      request.currentStage = 'Parallel';
      request.currentOffice = undefined;
      return;
    }

    /*
     * STEP 2: All seven offices must approve.
     */
    if (request.currentStage === 'Parallel') {
      const allApproved = this.getClearanceOffices(request.college).every(office =>
          request.approvals.find(approval => approval.office === office)?.status === 'Approved'
      );

      if (allApproved) {
        request.currentStage = 'Department';
        request.currentOffice = 'Department';
      }

      return;
    }

    /*
     * STEP 3: Department → Principal
     */
    if (request.currentStage === 'Department') {
      request.currentStage = 'Principal';
      request.currentOffice = 'Principal';
      return;
    }

    /*
     * STEP 4: Principal → Finance
     */
    if (request.currentStage === 'Principal') {
      request.currentStage = 'Finance';
      request.currentOffice = 'Finance';
      return;
    }

    /*
     * STEP 5: Finance → Completed
     */
    if (request.currentStage === 'Finance') {
      request.currentStage = 'Completed';
      request.currentOffice = undefined;
      request.status = 'Completed';
    }
  }

  // =====================================================
  // NORMALISE OLD REQUESTS
  // =====================================================

  private normaliseRequest(request: ClearanceRequest): ClearanceRequest {
    /*
     * Older requests may not have the new Convocation object.
     */
    if (!request.convocation) {
      request.convocation = {};
    }

    /*
     * Ensure approvals exist for all required offices.
     */
    const existing = request.approvals ?? [];
    const offices: ClearanceOffice[] = [
      'Convocation',
      ...this.clearanceOffices,
      'Department',
      'Principal',
      'Finance'
    ];

    for (const office of offices) {
      const exists = existing.some(approval => approval.office === office);

      if (!exists) {
        existing.push({
          office,
          status: 'Pending'
        });
      }
    }

    request.approvals = existing;

    return request;
  }

  // =====================================================
  // SAVE
  // =====================================================

  private save(request: ClearanceRequest): void {
    const requests = this.getAllRequests();
    const index = requests.findIndex(item => item.id === request.id);

    if (index === -1) {
      return;
    }

    requests[index] = request;
    this.storage.save(this.requestKey, requests);
  }
}