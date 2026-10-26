import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ClearanceOffice, ClearanceRequest } from '../../../core/models/clearance.model';

interface StudentProfile {
  id?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  fullName?: string;
  registrationNumber?: string;
  studentId?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  programme?: string;
}

@Component({
  selector: 'app-parallel-office-request-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './parallel-office-request-table.html',
  styleUrl: './parallel-office-request-table.css'
})
export class ParallelOfficeRequestTableComponent {
  @Input({ required: true }) requests: ClearanceRequest[] = [];
  @Input({ required: true }) office!: ClearanceOffice;
  @Output() approve = new EventEmitter<ClearanceRequest>();
  @Output() reject = new EventEmitter<ClearanceRequest>();

  private readonly studentCache = new Map<string, StudentProfile | null>();

  getOfficeStatus(request: ClearanceRequest): string {
    return request.approvals.find(approval => approval.office === this.office)?.status ?? 'Pending';
  }

  getStudentName(request: ClearanceRequest): string {
    const profile = this.getStudentProfile(request.studentId);
    const profileName = [profile?.firstName, profile?.middleName, profile?.lastName]
      .filter((part): part is string => !!part?.trim())
      .join(' ');
    const fullName = profileName || profile?.fullName?.trim() || request.studentName?.trim();
    if (!fullName) return '—';

    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length < 2) return fullName.toUpperCase();
    const surname = parts.pop();
    return `${surname}, ${parts.join(' ')}`.toUpperCase();
  }

  getRegistrationNumber(request: ClearanceRequest): string {
    return request.registrationNumber?.trim() ||
      this.getStudentProfile(request.studentId)?.registrationNumber?.trim() ||
      this.getStudentProfile(request.studentId)?.studentId?.trim() ||
      '—';
  }

  getEmail(request: ClearanceRequest): string {
    return request.email?.trim() || this.getStudentProfile(request.studentId)?.email?.trim() || '—';
  }

  getPhoneNumber(request: ClearanceRequest): string {
    const profile = this.getStudentProfile(request.studentId);
    return request.phoneNumber?.trim() || profile?.phoneNumber?.trim() || profile?.phone?.trim() || '—';
  }

  getProgramme(request: ClearanceRequest): string {
    return request.programme?.trim() || this.getStudentProfile(request.studentId)?.programme?.trim() || '—';
  }

  private getStudentProfile(studentId: string): StudentProfile | null {
    if (this.studentCache.has(studentId)) {
      return this.studentCache.get(studentId) ?? null;
    }

    try {
      const storedUsers: unknown = JSON.parse(localStorage.getItem('udsm-local-users') ?? 'null');
      const user = Array.isArray(storedUsers)
        ? storedUsers.find((item): item is StudentProfile =>
            typeof item === 'object' && item !== null &&
            'id' in item && item.id === studentId)
        : undefined;
      this.studentCache.set(studentId, user ?? null);
      return user ?? null;
    } catch (error) {
      console.error('Unable to read student profile data:', error);
      this.studentCache.set(studentId, null);
      return null;
    }
  }
}
