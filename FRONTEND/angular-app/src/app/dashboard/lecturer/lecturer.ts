import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { StudentClearanceLookup, StudentDebtFlag } from '../../core/models/student-debt.model';
import { AuthService } from '../../core/services/auth.service';
import { StudentDebtService } from '../../core/services/student-debt.service';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

@Component({
  selector: 'app-lecturer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent],
  templateUrl: './lecturer.html',
  styleUrl: './lecturer.css'
})
export class LecturerDashboard implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly debts = inject(StudentDebtService);
  private readonly router = inject(Router);

  flags: StudentDebtFlag[] = [];
  sidebarOpen = false;
  isLoading = false;
  isSubmitting = false;
  error = '';
  message = '';
  searchTerm = '';
  registrationNumber = '';
  clearanceLookup: StudentClearanceLookup | null = null;
  clearanceLookupLoading = false;
  clearanceLookupError = '';
  private clearanceLookupSequence = 0;
  amount: number | null = null;
  reason = '';
  negotiationNotes = '';
  resolvingFlag: StudentDebtFlag | null = null;
  resolutionNote = '';
  showAllPaymentRecords = false;

  get currentUser() { return this.auth.getCurrentUser(); }
  get clearanceLookupVerified(): boolean {
    return !!this.clearanceLookup
      && this.clearanceLookup.registrationNumber.toLowerCase() === this.registrationNumber.trim().toLowerCase();
  }
  get openCount(): number { return this.flags.filter(flag => flag.status === 'OPEN').length; }
  get resolvedCount(): number { return this.flags.filter(flag => flag.status === 'RESOLVED').length; }
  get paymentDueFlags(): StudentDebtFlag[] {
    const records = this.showAllPaymentRecords ? this.flags : this.flags.filter(flag => flag.status === 'OPEN');
    const term = this.searchTerm.trim().toLowerCase();
    return term ? records.filter(flag => flag.registrationNumber.toLowerCase().includes(term)
      || flag.studentName.toLowerCase().includes(term)
      || flag.reason.toLowerCase().includes(term)) : records;
  }

  ngOnInit(): void { this.loadFlags(); }

  clearClearanceLookup(): void {
    this.clearanceLookupSequence += 1;
    this.clearanceLookup = null;
    this.clearanceLookupError = '';
    this.clearanceLookupLoading = false;
  }

  checkStudentClearance(): void {
    if (this.clearanceLookupVerified || this.clearanceLookupLoading) return;
    this.clearanceLookup = null;
    this.clearanceLookupError = '';
    if (!this.registrationNumber.trim()) {
      this.clearanceLookupError = 'Enter a registration number to check clearance.';
      return;
    }
    const requestSequence = ++this.clearanceLookupSequence;
    this.clearanceLookupLoading = true;
    this.debts.lookupClearance(this.registrationNumber).subscribe({
      next: result => {
        if (requestSequence !== this.clearanceLookupSequence) return;
        this.clearanceLookup = result;
        this.clearanceLookupLoading = false;
      },
      error: err => {
        if (requestSequence !== this.clearanceLookupSequence) return;
        this.clearanceLookupError = err?.error?.message || 'Could not find clearance status for this registration number.';
        this.clearanceLookupLoading = false;
      }
    });
  }

  loadFlags(): void {
    this.isLoading = true;
    this.debts.listForLecturer().subscribe({
      next: flags => { this.flags = flags; this.isLoading = false; },
      error: err => {
        this.error = err?.error?.message || 'Could not load your debt register.';
        this.isLoading = false;
      }
    });
  }

  createFlag(): void {
    this.error = '';
    this.message = '';
    if (!this.registrationNumber.trim() || !this.amount || this.amount <= 0 || !this.reason.trim()) {
      this.error = 'Enter a registration number, a positive amount, and the reason for the debt.';
      return;
    }
    if (!this.clearanceLookup || this.clearanceLookup.registrationNumber.toLowerCase() !== this.registrationNumber.trim().toLowerCase()) {
      this.error = 'Check the student clearance status by registration number before recording a debt.';
      return;
    }
    if (this.clearanceLookup.cleared) {
      this.error = 'This student is already cleared. A debt flag cannot be recorded for a cleared student.';
      return;
    }
    this.isSubmitting = true;
    this.debts.create({
      registrationNumber: this.registrationNumber.trim(),
      amount: this.amount,
      reason: this.reason.trim(),
      negotiationNotes: this.negotiationNotes.trim() || undefined
    }).subscribe({
      next: flag => {
        this.flags = [flag, ...this.flags];
        this.registrationNumber = '';
        this.clearClearanceLookup();
        this.amount = null;
        this.reason = '';
        this.negotiationNotes = '';
        this.message = `Debt flag recorded for ${flag.studentName} (${flag.registrationNumber}) and sent to ${flag.department}.`;
        this.isSubmitting = false;
      },
      error: err => {
        this.error = err?.error?.message || 'The debt flag could not be recorded. Check the registration number and your department scope.';
        this.isSubmitting = false;
      }
    });
  }

  beginResolution(flag: StudentDebtFlag): void {
    this.resolvingFlag = flag;
    this.resolutionNote = '';
  }

  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar(): void { this.sidebarOpen = false; }

  resolveFlag(): void {
    if (!this.resolvingFlag || !this.resolutionNote.trim()) return;
    const flag = this.resolvingFlag;
    this.debts.resolve(flag.id, this.resolutionNote.trim()).subscribe({
      next: resolved => {
        this.flags = this.flags.map(item => item.id === resolved.id ? resolved : item);
        this.resolvingFlag = null;
        this.resolutionNote = '';
        this.message = `Debt for ${resolved.studentName} was cleared after negotiation. Department verification is available again.`;
      },
      error: err => { this.error = err?.error?.message || 'This debt record could not be resolved.'; }
    });
  }

  logout(): void {
    this.auth.logoutLocal();
    this.router.navigate(['/login']);
  }
}
