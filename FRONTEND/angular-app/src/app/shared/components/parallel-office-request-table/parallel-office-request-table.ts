import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ClearanceOffice, ClearanceRequest } from '../../../core/models/clearance.model';
import { ClearanceService } from '../../../core/services/clearance.service';
import { StudentDebtService } from '../../../core/services/student-debt.service';
import { ToastService } from '../../../core/services/toast.service';

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
  imports: [CommonModule, FormsModule],
  templateUrl: './parallel-office-request-table.html',
  styleUrl: './parallel-office-request-table.css'
})
export class ParallelOfficeRequestTableComponent implements OnInit {
  private readonly clearanceService = inject(ClearanceService);
  private readonly debtService = inject(StudentDebtService);
  private readonly toastService = inject(ToastService);

  @Input({ required: true }) requests: ClearanceRequest[] = [];
  @Input({ required: true }) office!: ClearanceOffice;
  @Output() approve = new EventEmitter<ClearanceRequest>();
  @Output() reject = new EventEmitter<ClearanceRequest>();
  @Output() view = new EventEmitter<ClearanceRequest>();
  @Output() bulkApproved = new EventEmitter<void>();
  @Output() withdrawn = new EventEmitter<ClearanceRequest>();

  private readonly studentCache = new Map<string, StudentProfile | null>();

  // Multi-select state
  selectedIds = new Set<string>();
  openDebtRegistrations = new Set<string>();
  isProcessingBulk = false;
  withdrawingId: string | null = null;

  ngOnInit(): void {
    this.loadOpenDebtFlags();
  }

  loadOpenDebtFlags(): void {
    this.debtService.listOpenForDepartment().subscribe({
      next: (flags) => {
        const regs = new Set<string>();
        (flags || []).forEach(f => {
          if (f.registrationNumber && f.status === 'OPEN') {
            regs.add(f.registrationNumber.trim().toUpperCase());
          }
        });
        this.openDebtRegistrations = regs;
      },
      error: () => {}
    });
  }

  isStudentFlagged(request: ClearanceRequest): boolean {
    const reg = this.getRegistrationNumber(request).trim().toUpperCase();
    return this.openDebtRegistrations.has(reg);
  }

  isSelectable(request: ClearanceRequest): boolean {
    const status = this.getOfficeStatus(request);
    // Cannot select if already approved, rejected, or flagged with unresolved debt
    return status === 'Pending' && !this.isStudentFlagged(request);
  }

  get selectableRequests(): ClearanceRequest[] {
    return this.requests.filter(r => this.isSelectable(r));
  }

  get isAllSelected(): boolean {
    const selectable = this.selectableRequests;
    return selectable.length > 0 && selectable.every(r => this.selectedIds.has(r.id));
  }

  toggleSelectAll(): void {
    if (this.isAllSelected) {
      this.selectedIds.clear();
    } else {
      this.selectableRequests.forEach(r => this.selectedIds.add(r.id));
    }
  }

  toggleSelect(request: ClearanceRequest): void {
    if (!this.isSelectable(request)) return;
    if (this.selectedIds.has(request.id)) {
      this.selectedIds.delete(request.id);
    } else {
      this.selectedIds.add(request.id);
    }
  }

  async approveSelected(): Promise<void> {
    const ids = Array.from(this.selectedIds);
    if (!ids.length) {
      this.toastService.warning('No Students Selected', 'Please select eligible students to approve.');
      return;
    }

    const count = ids.length;
    if (!confirm(`Are you sure you want to approve ${count} selected student(s) at once?`)) {
      return;
    }

    this.isProcessingBulk = true;
    try {
      this.clearanceService.bulkApproveOfficeBackend(ids, this.office, `Bulk approved by ${this.office} officer`).subscribe({
        next: (res) => {
          this.toastService.success('Bulk Approved', res?.message || `Approved ${count} students successfully.`);
          this.selectedIds.clear();
          this.isProcessingBulk = false;
          this.clearanceService.fetchOfficeRequests(this.office).subscribe({
            next: () => this.bulkApproved.emit(),
            error: () => this.bulkApproved.emit()
          });
        },
        error: (err) => {
          this.toastService.error('Bulk Approve Failed', err.error?.message || err.message || 'Error occurred');
          this.isProcessingBulk = false;
        }
      });
    } catch (e: any) {
      this.toastService.error('Error', e?.message || 'Failed to process bulk approval');
      this.isProcessingBulk = false;
    }
  }

  async withdraw(request: ClearanceRequest): Promise<void> {
    if (this.withdrawingId) return;
    const studentName = this.getStudentName(request);
    if (!confirm(`Withdraw ${this.office} decision for ${studentName} and return it to Pending?`)) {
      return;
    }

    this.withdrawingId = request.id;
    try {
      const ok = await this.clearanceService.withdrawOfficeDecision(request.id, this.office);
      if (ok) {
        request.approvals = request.approvals.map(approval => approval.office === this.office
          ? { ...approval, status: 'Pending', comment: undefined, reviewedBy: undefined, reviewedAt: undefined }
          : approval);
        request.status = 'Pending';
        request.currentStage = this.office === 'Department' ? 'Department'
          : this.office === 'Principal' ? 'Principal'
          : this.office === 'Finance' ? 'Finance'
          : this.office === 'Convocation' ? 'Convocation' : 'Parallel';
        request.currentOffice = this.office;
        this.toastService.info('Decision Withdrawn', `${this.office} decision for ${studentName} was returned to Pending.`);
        this.clearanceService.fetchOfficeRequests(this.office).subscribe({
          next: () => this.withdrawn.emit(request),
          error: () => this.withdrawn.emit(request)
        });
      } else {
        this.toastService.error('Withdraw Failed', 'Unable to withdraw this decision. Please refresh and try again.');
      }
    } finally {
      this.withdrawingId = null;
    }
  }

  getViewColumnHeader(): string {
    switch (this.office) {
      case 'USAB':
        return 'Hostel Details';
      case 'Games Coach':
        return 'Sports Details';
      case 'Hall Warden':
        return 'Hall Details';
      case 'DARUSO':
        return 'Union Details';
      case 'Library':
        return 'Library Details';
      case 'Smart Card':
        return 'Card Details';
      default:
        return 'Details';
    }
  }

  getOfficeStatus(request: ClearanceRequest): string {
    return request.approvals.find(approval => approval.office === this.office)?.status ?? 'Pending';
  }

  getRejectionReason(request: ClearanceRequest): string {
    return request.approvals.find(approval => approval.office === this.office)?.comment || 'No reason was recorded.';
  }

  getRejectionHistory(request: ClearanceRequest) {
    return request.rejectionHistory ?? [];
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
