// clearance.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import {
  ApprovalStatus,
  ClearanceOffice,
  ClearanceRequest,
  OfficeApproval
} from '../models/clearance.model';

import { StorageService } from './storage.service';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class ClearanceService {

  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly storage = new StorageService();
  private readonly requestKey = 'udsm-clearance-requests';
  private readonly draftKey = 'udsm-clearance-drafts';

  private readonly lastOfficeFetchTime: Record<string, number> = {};
  private readonly lastStudentFetchTime: Record<string, number> = {};

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

  private getAuthHeaders(): HttpHeaders {
    const token = this.storage.get<string>('udsm-auth-token')
      || (typeof localStorage !== 'undefined' ? localStorage.getItem('udsm-auth-token') : null);
    if (!token) {
      return new HttpHeaders();
    }
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  // =====================================================
  // BACKEND INTEGRATION & DATA MAPPING
  // =====================================================

  mapBackendResponseToClearanceRequest(res: any): ClearanceRequest {
    const mapApprovalStatus = (st: string): ApprovalStatus => {
      if (!st) return 'Pending';
      const s = String(st).toUpperCase();
      if (s === 'APPROVED' || s === 'CLEARED' || s === 'COMPLETED') return 'Approved';
      if (s === 'REJECTED') return 'Rejected';
      return 'Pending';
    };

    const mapOverallStatus = (st: string): 'Pending' | 'Completed' | 'Rejected' => {
      if (!st) return 'Pending';
      const s = String(st).toUpperCase();
      if (s === 'APPROVED' || s === 'CLEARED' || s === 'COMPLETED') return 'Completed';
      if (s === 'REJECTED') return 'Rejected';
      return 'Pending';
    };

    const rawApprovals = res.approvals || [];
    const approvals: OfficeApproval[] = Array.isArray(rawApprovals)
      ? rawApprovals.map((a: any) => ({
          office: (a.office || a.departmentName || a.department) as ClearanceOffice,
          status: mapApprovalStatus(a.status),
          comment: a.comment || a.comments || '',
          reviewedBy: a.reviewedBy || a.approvedBy || '',
          reviewedAt: a.reviewedAt || a.approvalDate || ''
        }))
      : [];

    return {
      id: String(res.requestId || res.id),
      studentId: res.studentId || '',
      studentName: res.studentName || '',
      registrationNumber: res.registrationNumber || '',
      email: res.email || '',
      phoneNumber: res.phoneNumber || '',
      physicalAddress: res.physicalAddress || res.address || '',
      address: res.address || res.physicalAddress || '',
      college: res.college || res.faculty || '',
      department: res.department || '',
      programme: res.programme || '',
      hall: res.hall || '',
      wing: res.wing || '',
      block: res.block || '',
      roomNumber: res.roomNumber || '',
      sponsor: res.sponsor || '',
      photo: res.photo || '',
      requestDate: res.requestDate ? (typeof res.requestDate === 'string' ? res.requestDate : new Date(res.requestDate).toISOString()) : new Date().toISOString(),
      status: mapOverallStatus(res.status),
      currentOffice: res.currentOffice as ClearanceOffice,
      currentStage: (res.currentStage || 'Convocation') as any,
      approvals: approvals.length > 0 ? approvals : this.getDefaultApprovals(res.college || res.faculty)
    };
  }

  mergeRequestsIntoStorage(incoming: ClearanceRequest[]): void {
    if (!incoming || incoming.length === 0) return;
    const existing = this.storage.get<ClearanceRequest[]>(this.requestKey) ?? [];
    const map = new Map<string, ClearanceRequest>();

    for (const req of existing) {
      if (req.id) map.set(req.id, req);
    }

    for (const inc of incoming) {
      let foundKey: string | null = null;
      for (const [key, val] of map.entries()) {
        if (val.id === inc.id || (inc.registrationNumber && val.registrationNumber === inc.registrationNumber)) {
          foundKey = key;
          break;
        }
      }
      if (foundKey) {
        const curr = map.get(foundKey)!;
        map.delete(foundKey);
        map.set(inc.id, { ...curr, ...inc });
      } else {
        map.set(inc.id, inc);
      }
    }

    const merged = Array.from(map.values());
    this.storage.save(this.requestKey, merged);
  }

  fetchOfficeRequests(office: ClearanceOffice, status?: string): Observable<ClearanceRequest[]> {
    const headers = this.getAuthHeaders();
    let url = `${this.config.apiUrl}/clearance/office/requests?office=${encodeURIComponent(office)}`;
    if (status) {
      url += `&status=${encodeURIComponent(status)}`;
    }

    return this.http.get<any[]>(url, { headers }).pipe(
      map(responses => {
        const mapped = (responses || []).map(r => this.mapBackendResponseToClearanceRequest(r));
        this.mergeRequestsIntoStorage(mapped);
        return mapped;
      }),
      catchError(err => {
        console.warn(`Could not fetch backend requests for ${office}:`, err);
        return of(this.getRequestsForOffice(office));
      })
    );
  }

  fetchMyRequest(): Observable<ClearanceRequest | null> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.config.apiUrl}/clearance/my-request`, { headers }).pipe(
      map(response => {
        if (!response) return null;
        const mapped = this.mapBackendResponseToClearanceRequest(response);
        this.mergeRequestsIntoStorage([mapped]);
        return mapped;
      }),
      catchError(err => {
        console.warn('Could not fetch student clearance request from backend:', err);
        return of(null);
      })
    );
  }

  approveOfficeBackend(requestId: string, office: ClearanceOffice, comments: string = 'Approved'): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.config.apiUrl}/clearance/office/approve`, {
      requestId,
      office,
      comments
    }, { headers });
  }

  rejectOfficeBackend(requestId: string, office: ClearanceOffice, reason: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.config.apiUrl}/clearance/office/reject`, {
      requestId,
      office,
      reason
    }, { headers });
  }

  withdrawOfficeBackend(requestId: string, office: ClearanceOffice): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.config.apiUrl}/clearance/office/withdraw`, {
      requestId,
      office
    }, { headers });
  }

  getDefaultApprovals(college: string): OfficeApproval[] {
    return [
      { office: 'Convocation', status: 'Pending' },
      ...this.getClearanceOffices(college).map(office => ({ office, status: 'Pending' as ApprovalStatus })),
      { office: 'Department', status: 'Pending' },
      { office: 'Principal', status: 'Pending' },
      { office: 'Finance', status: 'Pending' }
    ];
  }

  submitBackendRequest(requestData: {
    studentName: string;
    registrationNumber: string;
    email?: string;
    phoneNumber?: string;
    physicalAddress?: string;
    address?: string;
    programme: string;
    college: string;
    department: string;
    academicYear: string;
    hall: string;
    wing?: string;
    block?: string;
    roomNumber?: string;
    sponsor?: string;
    photo?: string;
  }): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.config.apiUrl}/clearance/request`, {
      ...requestData,
      confirm: true
    }, { headers });
  }

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
    email?: string;
    phoneNumber?: string;
    physicalAddress?: string;
    address?: string;
    college: string;
    department: string;
    programme: string;
    hall?: string;
    wing?: string;
    block?: string;
    roomNumber?: string;
    residenceType?: 'Hostel Dwellers' | 'Non-Hostel Dwellers' | 'Off Campus';
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
      email: requestData.email || '',
      phoneNumber: requestData.phoneNumber || '',
      physicalAddress: requestData.physicalAddress || requestData.address || '',
      address: requestData.address || requestData.physicalAddress || '',
      college: requestData.college,
      department: requestData.department,
      programme: requestData.programme,
      hall: requestData.hall || '',
      wing: requestData.wing || '',
      block: requestData.block || '',
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
  // GET STUDENT REQUESTS (AUTO-SYNC WITH BACKEND)
  // =====================================================

  getStudentRequests(studentId: string): ClearanceRequest[] {
    const now = Date.now();
    if (!this.lastStudentFetchTime[studentId] || (now - this.lastStudentFetchTime[studentId] > 10000)) {
      this.lastStudentFetchTime[studentId] = now;
      this.fetchMyRequest().subscribe({
        next: () => {},
        error: () => {}
      });
    }
    const authUser = this.storage.get<any>('udsm-auth-user');
    const userReg = authUser?.registrationNumber?.trim()?.toLowerCase();
    const userEmail = authUser?.email?.trim()?.toLowerCase();
    return this.getAllRequests().filter(request =>
      request.studentId === studentId ||
      (userReg && request.registrationNumber && request.registrationNumber.trim().toLowerCase() === userReg) ||
      (userEmail && request.email && request.email.trim().toLowerCase() === userEmail)
    );
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
  // GET REQUESTS FOR OFFICE (AUTO-SYNC WITH BACKEND)
  // =====================================================

  getRequestsForOffice(
      office: ClearanceOffice,
      college?: string,
      department?: string
  ): ClearanceRequest[] {
    const now = Date.now();
    const cacheKey = `${office}_${college || ''}_${department || ''}`;
    if (!this.lastOfficeFetchTime[cacheKey] || (now - this.lastOfficeFetchTime[cacheKey] > 10000)) {
      this.lastOfficeFetchTime[cacheKey] = now;
      this.fetchOfficeRequests(office).subscribe({
        next: () => {},
        error: () => {}
      });
    }

    return this.getAllRequests().filter(request => {
      if (office === 'Convocation') {
        return request.approvals.some(item => item.office === 'Convocation');
      }

      if (this.getClearanceOffices(request.college).includes(office)) {
        return true;
      }

      if (office === 'Department') {
        return (
            (!college || request.college === college) &&
            (!department || request.department === department)
        );
      }

      if (office === 'Principal') {
        return !college || request.college === college;
      }

      return true;
    });
  }

  // =====================================================
  // STEP 1 - STUDENT REQUESTS CONTROL NUMBER
  // =====================================================

  requestControlNumber(requestId: string, controlNumber?: string): void {
    const request = this.getRequest(requestId);

    if (!request) {
      return;
    }

    if (request.currentStage !== 'Convocation') {
      return;
    }

    if (request.convocation?.controlNumberRequestedAt) {
      return;
    }

    request.convocation = {
      ...(request.convocation ?? {}),
      controlNumberRequestedAt: new Date().toISOString(),
      ...(controlNumber ? { controlNumber, controlNumberIssuedAt: new Date().toISOString() } : {})
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

    if (request.convocation?.controlNumber) {
      return request.convocation.controlNumber;
    }

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

  submitConvocationReceipt(requestId: string, receiptData: string): void {
    const request = this.getRequest(requestId);

    if (!request) {
      return;
    }

    if (request.currentStage !== 'Convocation') {
      return;
    }

    if (!request.convocation?.controlNumber) {
      return;
    }

    request.convocation = {
      ...(request.convocation ?? {}),
      receiptFileName: 'Payment Receipt',
      receiptData: receiptData,
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

    if (!request.convocation?.receiptFileName) {
      return;
    }

    if (!request.convocation.receiptSubmittedAt) {
        request.convocation.receiptSubmittedAt = new Date().toISOString();
        request.convocation.receiptFileName = 'Verified by Officer';
    }

    this.save(request);
  }

  // =====================================================
  // APPROVE (UPDATES LOCAL STORAGE + BACKEND POSTGRESQL)
  // =====================================================

  approveRequest(
      requestId: string,
      office: ClearanceOffice,
      staffName: string,
      comment?: string
  ): boolean {
    const request = this.getRequest(requestId);
    const approval = request?.approvals.find(item => item.office === office);

    if (request && approval) {
      approval.status = 'Approved';
      approval.comment = comment || 'Approved';
      approval.reviewedBy = staffName;
      approval.reviewedAt = new Date().toISOString();

      this.moveToNextStage(request);
      this.save(request);
    }

    // Call backend API asynchronously
    this.approveOfficeBackend(requestId, office, comment || 'Approved').subscribe({
      next: (res) => {
        console.log(`Backend approval succeeded for ${office} on request ${requestId}`);
        if (res && res.data) {
          const updated = this.mapBackendResponseToClearanceRequest(res.data);
          this.mergeRequestsIntoStorage([updated]);
        }
      },
      error: (err) => console.error(`Backend approval error for ${office}:`, err)
    });

    return true;
  }

  // =====================================================
  // REJECT (UPDATES LOCAL STORAGE + BACKEND POSTGRESQL)
  // =====================================================

  rejectRequest(
      requestId: string,
      office: ClearanceOffice,
      staffName: string,
      comment: string
  ): boolean {
    const request = this.getRequest(requestId);
    const approval = request?.approvals.find(item => item.office === office);

    if (request && approval) {
      approval.status = 'Rejected';
      approval.comment = comment.trim();
      approval.reviewedBy = staffName;
      approval.reviewedAt = new Date().toISOString();

      request.status = 'Rejected';
      request.revisionOffice = office;

      this.save(request);
    }

    // Call backend API asynchronously
    this.rejectOfficeBackend(requestId, office, comment.trim()).subscribe({
      next: (res) => {
        console.log(`Backend rejection succeeded for ${office} on request ${requestId}`);
        if (res && res.data) {
          const updated = this.mapBackendResponseToClearanceRequest(res.data);
          this.mergeRequestsIntoStorage([updated]);
        }
      },
      error: (err) => console.error(`Backend rejection error for ${office}:`, err)
    });

    return true;
  }

  // =====================================================
  // WITHDRAW DECISION (UPDATES LOCAL STORAGE + BACKEND)
  // =====================================================

  withdrawOfficeDecision(requestId: string, office: ClearanceOffice): boolean {
    const request = this.getRequest(requestId);
    const approval = request?.approvals.find(item => item.office === office);

    if (request && approval) {
      approval.status = 'Pending';
      approval.comment = undefined;
      approval.reviewedBy = undefined;
      approval.reviewedAt = undefined;
      this.save(request);
    }

    this.withdrawOfficeBackend(requestId, office).subscribe({
      next: (res) => {
        if (res && res.data) {
          const updated = this.mapBackendResponseToClearanceRequest(res.data);
          this.mergeRequestsIntoStorage([updated]);
        }
      },
      error: (err) => console.error(`Backend withdraw error for ${office}:`, err)
    });

    return true;
  }

  resubmitRequest(
      requestId: string,
      requestData: Partial<Pick<ClearanceRequest,
          'email' | 'phoneNumber' | 'physicalAddress' | 'address' | 'college' | 'department' | 'programme' | 'hall' | 'wing' | 'block' | 'roomNumber' |
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
    if (request.currentStage === 'Convocation') {
      request.currentStage = 'Parallel';
      request.currentOffice = undefined;
      return;
    }

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

    if (request.currentStage === 'Department') {
      request.currentStage = 'Principal';
      request.currentOffice = 'Principal';
      return;
    }

    if (request.currentStage === 'Principal') {
      request.currentStage = 'Finance';
      request.currentOffice = 'Finance';
      return;
    }

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
    if (!request.convocation) {
      request.convocation = {};
    }

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
