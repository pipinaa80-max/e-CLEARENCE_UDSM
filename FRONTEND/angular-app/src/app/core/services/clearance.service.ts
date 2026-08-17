import { Injectable } from '@angular/core';

import { ClearanceApproval, ClearanceRequest, ClearanceStatus } from '../models/clearance.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class ClearanceService {
  private readonly storage = new StorageService();
  private readonly requestKey = 'udsm-clearance-requests';
  private readonly approvalKey = 'udsm-clearance-approvals';
  private readonly draftKey = 'udsm-clearance-drafts';

  saveDraft(studentId: string, clearanceType: ClearanceRequest['clearanceType'], remarks: string, academicProfile?: Pick<ClearanceRequest, 'college' | 'department' | 'programme'>): void {
    const drafts = this.storage.get<Record<string, { clearanceType: ClearanceRequest['clearanceType']; remarks: string; academicProfile?: Pick<ClearanceRequest, 'college' | 'department' | 'programme'> }>>(this.draftKey) ?? {};
    drafts[studentId] = { clearanceType, remarks, academicProfile };
    this.storage.save(this.draftKey, drafts);
  }

  getDraft(studentId: string): { clearanceType: ClearanceRequest['clearanceType']; remarks: string; academicProfile?: Pick<ClearanceRequest, 'college' | 'department' | 'programme'> } | null {
    return (this.storage.get<Record<string, { clearanceType: ClearanceRequest['clearanceType']; remarks: string; academicProfile?: Pick<ClearanceRequest, 'college' | 'department' | 'programme'> }>>(this.draftKey) ?? {})[studentId] ?? null;
  }

  clearDraft(studentId: string): void {
    const drafts = this.storage.get<Record<string, { clearanceType: ClearanceRequest['clearanceType']; remarks: string }>>(this.draftKey) ?? {};
    delete drafts[studentId];
    this.storage.save(this.draftKey, drafts);
  }

  createRequest(request: Omit<ClearanceRequest, 'id' | 'requestDate' | 'status' | 'currentOffice'>): ClearanceRequest {
    const newRequest: ClearanceRequest = {
      ...request,
      id: crypto.randomUUID(),
      requestDate: new Date().toISOString(),
      status: 'Pending',
      currentOffice: 'Library'
    };

    const requests = this.getAllRequests();
    requests.push(newRequest);
    this.storage.save(this.requestKey, requests);
    return newRequest;
  }

  getAllRequests(): ClearanceRequest[] {
    const requests = this.storage.get<ClearanceRequest[]>(this.requestKey);
    if (requests && requests.length > 0) {
      return requests;
    }

    const seeded = this.seedDemoRequests();
    this.storage.save(this.requestKey, seeded);
    return seeded;
  }

  getStudentRequests(studentId: string): ClearanceRequest[] {
    return this.getAllRequests().filter((request) => request.studentId === studentId);
  }

  getPendingRequests(): ClearanceRequest[] {
    return this.getAllRequests().filter((request) => request.status === 'Pending');
  }

  getRequest(id: string): ClearanceRequest | undefined {
    return this.getAllRequests().find((request) => request.id === id);
  }

  getClearanceStatus(studentId: string): ClearanceStatus {
    const requests = this.getStudentRequests(studentId);
    const latest = requests[requests.length - 1];
    return latest?.status ?? 'Not Requested';
  }

  getClearanceHistory(studentId: string): ClearanceRequest[] {
    return this.getStudentRequests(studentId).slice().reverse();
  }

  approveClearance(clearanceId: string, officeId: string): ClearanceApproval {
    const approval: ClearanceApproval = {
      id: crypto.randomUUID(),
      clearanceId,
      officeId,
      officerId: 'officer-001',
      status: 'Approved',
      comment: 'Approved',
      date: new Date().toISOString()
    };

    const approvals = this.storage.get<ClearanceApproval[]>(this.approvalKey) ?? [];
    approvals.push(approval);
    this.storage.save(this.approvalKey, approvals);

    const request = this.getRequest(clearanceId);
    if (request) {
      request.status = 'Approved';
      this.updateRequest(request);
    }

    return approval;
  }

  rejectClearance(clearanceId: string, officeId: string, comment: string): ClearanceApproval {
    const approval: ClearanceApproval = {
      id: crypto.randomUUID(),
      clearanceId,
      officeId,
      officerId: 'officer-001',
      status: 'Rejected',
      comment,
      date: new Date().toISOString()
    };

    const approvals = this.storage.get<ClearanceApproval[]>(this.approvalKey) ?? [];
    approvals.push(approval);
    this.storage.save(this.approvalKey, approvals);

    const request = this.getRequest(clearanceId);
    if (request) {
      request.status = 'Rejected';
      this.updateRequest(request);
    }

    return approval;
  }

  private updateRequest(request: ClearanceRequest): void {
    const requests = this.getAllRequests().map((item) => (item.id === request.id ? request : item));
    this.storage.save(this.requestKey, requests);
  }

  private seedDemoRequests(): ClearanceRequest[] {
    const now = new Date();
    const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

    const currentUser = this.storage.get<{ id?: string }>('udsm-current-user');
    const demoStudentId = currentUser?.id ?? 'demo-student';

    return [
      {
        id: crypto.randomUUID(),
        studentId: demoStudentId,
        clearanceType: 'Graduation Clearance',
        requestDate: daysAgo(18),
        status: 'Approved',
        currentOffice: 'Academic',
        remarks: 'Academic compliance check completed.'
      },
      {
        id: crypto.randomUUID(),
        studentId: demoStudentId,
        clearanceType: 'Graduation Clearance',
        requestDate: daysAgo(11),
        status: 'Pending',
        currentOffice: 'Library',
        remarks: 'Awaiting library verification.'
      },
      {
        id: crypto.randomUUID(),
        studentId: demoStudentId,
        clearanceType: 'Graduation Clearance',
        requestDate: daysAgo(6),
        status: 'Pending',
        currentOffice: 'Finance',
        remarks: 'Fee statement under financial review.'
      },
      {
        id: crypto.randomUUID(),
        studentId: demoStudentId,
        clearanceType: 'Graduation Clearance',
        requestDate: daysAgo(3),
        status: 'Rejected',
        currentOffice: 'ICT',
        remarks: 'Missing system clearance certificate.'
      }
    ];
  }
}
