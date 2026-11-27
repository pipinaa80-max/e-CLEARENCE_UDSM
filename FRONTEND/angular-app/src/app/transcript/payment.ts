import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { TranscriptPaymentService } from '../core/services/transcript-payment.service';
import { ToastService } from '../core/services/toast.service';
import { TranscriptPaymentRequest } from './transcript-payment.model';
import { DashboardHeaderComponent } from '../shared/components/dashboard-header/dashboard-header';
import { StudentSidebarComponent } from '../shared/components/student-sidebar/student-sidebar';

@Component({
  selector: 'app-transcript-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent, StudentSidebarComponent],
  templateUrl: './payment.html',
  styleUrl: './payment.css'
})
export class TranscriptPaymentComponent implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly paymentService = inject(TranscriptPaymentService);
  private readonly toastService = inject(ToastService);
  private statusRefreshTimer: ReturnType<typeof setInterval> | null = null;

  sidebarOpen = false;
  request: TranscriptPaymentRequest | null = null;
  message = '';
  isSubmitting = false;
  isPreparingAdditionalCopy = false;
  enteredControlNumber = '';
  statusVerified = false;

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  get isTranscriptPaid(): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    const requests = this.paymentService.getStudentRequests(user.id).filter(request => request.serverManaged);
    return requests.some(r => r.attemptNumber === 1 && r.status === 'Paid');
  }

  get hasApproval(): boolean {
    const user = this.authService.getCurrentUser();
    return this.statusVerified && !!user && this.paymentService.getStudentRequests(user.id)
      .some(request => request.serverManaged && request.status === 'Paid');
  }

  get isFirstRequest(): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    const requests = this.paymentService.getStudentRequests(user.id).filter(request => request.serverManaged);

    if (this.request) {
      return this.request.attemptNumber === 1;
    }

    return requests.length === 0;
  }

  get isStandaloneMode(): boolean {
    return this.isPreparingAdditionalCopy || !this.isFirstRequest;
  }

  get nextRequestAmount(): number {
    return 15000;
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'Student') {
      this.router.navigate(['/login']);
      return;
    }

    const lastRequest = this.paymentService.getStudentRequests(user.id).filter(item => item.serverManaged).at(-1) ?? null;
    const startAdditionalCopy = this.route.snapshot.queryParamMap.get('additional') === 'true';

    if (startAdditionalCopy && lastRequest?.status === 'Paid') {
      this.request = null;
      this.isPreparingAdditionalCopy = true;
    } else {
      this.request = lastRequest;
    }

    void this.paymentService.refreshStudentControlNumberRequests().then(() => {
      const latest = this.paymentService.getStudentRequests(user.id).filter(item => item.serverManaged).at(-1) ?? null;
      if (latest) this.request = latest;
      this.statusVerified = true;
      this.refreshStatusWhilePending();
    }).catch(() => {
      this.statusVerified = false;
      this.toastService.error('Transcript Status Unavailable', 'Could not verify your transcript payment status. Refresh the page and try again.');
    });

    this.refreshStatusWhilePending();
  }

  private isPollingStatus = false;

  private refreshStatusWhilePending(): void {
    if (this.request?.status !== 'Receipt Submitted' || this.statusRefreshTimer) return;

    this.statusRefreshTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (this.isPollingStatus) return;
      const user = this.authService.getCurrentUser();
      if (!user || !this.request) return;
      this.isPollingStatus = true;
      void this.paymentService.refreshStudentControlNumberRequests().then(() => {
        const latestRequest = this.paymentService.getStudentRequests(user.id)
          .filter(item => item.serverManaged)
          .find(item => item.paymentBatchId === this.request?.paymentBatchId);
        if (latestRequest) this.request = latestRequest;
        if (this.request?.status !== 'Receipt Submitted') this.clearStatusRefreshTimer();
      }).catch(() => {}).finally(() => {
        this.isPollingStatus = false;
      });
    }, 15000);
  }

  private clearStatusRefreshTimer(): void {
    if (!this.statusRefreshTimer) return;
    clearInterval(this.statusRefreshTimer);
    this.statusRefreshTimer = null;
  }

  ngOnDestroy(): void {
    this.clearStatusRefreshTimer();
  }

  async submitControlNumber(): Promise<void> {
    const user = this.authService.getCurrentUser();
    const controlNumber = this.enteredControlNumber.trim();
    if (!user || !controlNumber) return;

    this.isSubmitting = true;
    this.message = '';
    try {
      const submittedRequests = await this.paymentService.submitControlNumberBatch(controlNumber);
      this.request = submittedRequests.at(-1) ?? null;
      if (this.request) {
        localStorage.removeItem(`udsm-transcript-documents-submitted-${this.request.studentId}`);
        localStorage.removeItem(`udsm-transcript-acquired-${this.request.studentId}`);
        this.toastService.success('Control Number Submitted', 'Your payment control number was submitted to Finance for verification.');
        this.enteredControlNumber = '';
        this.request = this.paymentService.getStudentRequests(user.id).filter(item => item.serverManaged).at(-1) ?? null;
        this.refreshStatusWhilePending();
        setTimeout(() => this.router.navigate(['/transcript/process']), 400);
      } else {
        this.toastService.error('Submission Failed', 'Could not submit the control number. Please try again.');
      }
    } catch (error) {
      console.error('Submission failed:', error);
      this.toastService.error('Submission Failed', 'Could not submit the control number. Please try again.');
    } finally {
      this.isSubmitting = false;
    }
  }

  isPrinted(requestId?: string): boolean {
    if (!requestId) return false;
    return localStorage.getItem(`udsm-transcript-printed-${requestId}`) === 'true';
  }

  printTranscript(request?: any): void {
    if (!request) return;
    const user = this.authService.getCurrentUser();
    if (!user) return;

    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const regNo = request?.registrationNumber || user.registrationNumber || 'N/A';
    const fullName = request?.studentName || user.fullName || 'N/A';
    const programme = user.programme || 'Bachelor of Science in Business Information Technology';

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Official_Academic_Transcript_${regNo}.pdf</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background: #ffffff; line-height: 1.5; }
    .header { text-align: center; border-bottom: 2px solid #003b5c; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: 800; color: #003b5c; margin-bottom: 5px; letter-spacing: 0.5px; }
    .sub-logo { font-size: 13px; font-weight: 700; color: #00679b; text-transform: uppercase; letter-spacing: 1px; }
    .title { font-size: 18px; font-weight: 800; margin-top: 20px; text-decoration: underline; color: #0f172a; }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; font-size: 14px; }
    .info-item strong { display: inline-block; width: 160px; color: #334155; }

    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
    th { background: #f1f5f9; text-align: left; padding: 10px; border: 1px solid #cbd5e1; color: #1e293b; font-weight: 700; }
    td { padding: 10px; border: 1px solid #cbd5e1; color: #0f172a; }

    .summary { margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 15px; text-align: right; font-size: 15px; }
    .footer { margin-top: 50px; font-size: 12px; color: #64748b; display: flex; justify-content: space-between; align-items: flex-end; }
    .signature { text-align: center; width: 220px; border-top: 1px solid #333; padding-top: 5px; font-weight: 700; color: #0f172a; }

    .no-print { text-align: center; margin-top: 40px; }
    .btn-print { padding: 12px 28px; background: #00679b; color: #ffffff; border: none; border-radius: 6px; font-size: 14px; font-weight: 700; cursor: pointer; transition: background 0.2s; }
    .btn-print:hover { background: #003b5c; }

    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">UNIVERSITY OF DAR ES SALAAM</div>
    <div class="sub-logo">OFFICE OF THE DEPUTY VICE CHANCELLOR - ACADEMIC</div>
    <div class="title">OFFICIAL ACADEMIC TRANSCRIPT</div>
  </div>

  <div class="info-grid">
    <div class="info-item"><strong>STUDENT NAME:</strong> ${fullName.toUpperCase()}</div>
    <div class="info-item"><strong>REGISTRATION NO:</strong> ${regNo}</div>
    <div class="info-item"><strong>PROGRAMME:</strong> ${programme}</div>
    <div class="info-item"><strong>DATE OF ISSUE:</strong> ${date}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>COURSE CODE</th>
        <th>COURSE TITLE</th>
        <th>UNITS</th>
        <th>GRADE</th>
        <th>REMARK</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>IS 101</td><td>Introduction to Information Systems</td><td>3.0</td><td>A</td><td>PASS</td></tr>
      <tr><td>CS 102</td><td>Programming in C++</td><td>4.0</td><td>B+</td><td>PASS</td></tr>
      <tr><td>MT 111</td><td>Business Mathematics</td><td>3.0</td><td>A</td><td>PASS</td></tr>
      <tr><td>EC 110</td><td>Principles of Microeconomics</td><td>3.0</td><td>B</td><td>PASS</td></tr>
      <tr><td>IS 201</td><td>Database Management Systems</td><td>3.0</td><td>A</td><td>PASS</td></tr>
      <tr><td>IS 205</td><td>Web Technologies</td><td>3.0</td><td>A</td><td>PASS</td></tr>
      <tr><td>LW 100</td><td>Constitutional Law</td><td>2.0</td><td>C</td><td>PASS</td></tr>
      <tr><td>IS 300</td><td>Systems Analysis and Design</td><td>4.0</td><td>A</td><td>PASS</td></tr>
      <tr><td>IS 310</td><td>Final Year Project</td><td>6.0</td><td>A</td><td>PASS</td></tr>
    </tbody>
  </table>

  <div class="summary">
    <strong>Cumulative GPA: 4.2 / 5.0</strong>
  </div>

  <div class="footer">
    <div>Verification Code: UDSM-TRANS-${Math.floor(Math.random() * 90000) + 10000}</div>
    <div class="signature">Registrar (Academic)</div>
  </div>

  <div class="no-print">
    <button class="btn-print" onclick="window.print()">Save Transcript as PDF</button>
  </div>
</body>
</html>`;

    try {
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, '_blank');
      if (!win) {
        this.toastService.warning('Popup Blocked', 'Please allow popups to print your transcript.');
      } else {
        localStorage.setItem(`udsm-transcript-printed-${request.id}`, 'true');
      }
    } catch (e) {
      console.error('Error printing transcript:', e);
      this.toastService.error('Error', 'Could not open transcript document.');
    }
  }
}
