import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../core/services/auth.service';
import { ClearanceService } from '../core/services/clearance.service';
import { ClearanceRequest } from '../core/models/clearance.model';
import { DashboardHeaderComponent } from '../shared/components/dashboard-header/dashboard-header';
import { TranscriptPaymentService } from '../core/services/transcript-payment.service';
import { TranscriptPaymentRequest } from './transcript-payment.model';

@Component({
  selector: 'app-transcript',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RouterLinkActive, DashboardHeaderComponent],
  templateUrl: './transcript.html',
  styleUrl: './transcript.css'
})
export class TranscriptComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly transcriptService = inject(TranscriptPaymentService);
  private readonly router = inject(Router);

  sidebarOpen = false;
  request: ClearanceRequest | null = null;
  isSubmitted = false;
  decision: 'Approved' | 'Rejected' | null = null;
  message = '';

  transcriptForm = this.fb.nonNullable.group({
    surname: ['', Validators.required],
    otherNames: ['', Validators.required],
    registrationNumber: ['', Validators.required],
    graduationYear: ['', Validators.required],
    phone: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    physicalAddress: ['', Validators.required],
    termsAccepted: [false, Validators.requiredTrue]
  });

  readonly graduationYears = ['2024', '2025', '2026', '2027', '2028'];

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'Student') {
      this.router.navigate(['/login']);
      return;
    }

    const requests = this.clearanceService.getStudentRequests(user.id);
    this.request = requests.at(-1) ?? null;

    const fullName = this.request?.studentName || user.fullName || '';
    const names = fullName.trim().split(/\s+/).filter(Boolean);
    const surname = names.length ? names[names.length - 1] : '';
    const otherNames = names.slice(0, -1).join(' ');

    this.transcriptForm.patchValue({
      surname,
      otherNames,
      registrationNumber: this.request?.registrationNumber || user.registrationNumber || '',
      graduationYear: new Date().getFullYear().toString(),
      phone: user.phoneNumber || user.phone || '',
      email: user.email || '',
      physicalAddress: this.request?.hall || ''
    });

    const savedDecision = localStorage.getItem(`udsm-transcript-decision-${user.id}`);
    if (savedDecision === 'Approved' || savedDecision === 'Rejected') {
      this.decision = savedDecision;
      this.isSubmitted = true;
      this.transcriptForm.disable();
    }
  }

  get allTranscriptRequests(): TranscriptPaymentRequest[] {
    const user = this.authService.getCurrentUser();
    return user ? this.transcriptService.getStudentRequests(user.id).slice().reverse() : [];
  }

  get hasCompletedFirstRequest(): boolean {
    return this.allTranscriptRequests.some(r => r.attemptNumber === 1 && r.status === 'Paid');
  }

  get hasUnverifiedActiveRequest(): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    const requests = this.transcriptService.getStudentRequests(user.id);
    const last = requests.at(-1);
    return !!last && last.status !== 'Paid';
  }

  notifyPendingRequest(): void {
    const user = this.authService.getCurrentUser();
    const requests = user ? this.transcriptService.getStudentRequests(user.id) : [];
    const last = requests.at(-1);
    const reqNum = last ? `#${last.attemptNumber}` : '';
    this.message = `Pending Request Active: Request ${reqNum} is currently awaiting Finance verification. You cannot order additional copies until Finance verifies it.`;
  }

  get currentActiveRequest(): TranscriptPaymentRequest | null {
    return this.allTranscriptRequests.find(r => r.status !== 'Paid') || null;
  }

  approve(): void {
    if (this.transcriptForm.invalid) {
      this.transcriptForm.markAllAsTouched();
      this.message = 'Please complete the form and accept the terms before approving.';
      return;
    }

    this.saveDecision('Approved');
    this.message = 'Transcript request approved. Continue to the payment dashboard to request a control number.';
    this.router.navigate(['/transcript/process']);
  }

  reject(): void {
    if (!this.transcriptForm.value.termsAccepted) {
      this.message = 'Please review and accept the terms before continuing.';
      return;
    }

    this.saveDecision('Rejected');
    this.message = 'Transcript request rejected.';
  }

  private saveDecision(decision: 'Approved' | 'Rejected'): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.decision = decision;
    this.isSubmitted = true;
    const requestValue = {
      ...this.transcriptForm.getRawValue(),
      award: user.award || 'Bachelor Degree'
    };
    localStorage.setItem(`udsm-transcript-decision-${user.id}`, decision);
    localStorage.setItem(`udsm-transcript-request-${user.id}`, JSON.stringify(requestValue));
    this.transcriptForm.disable();
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

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
    const requests = this.transcriptService.getStudentRequests(user.id);
    return requests.some(r => r.attemptNumber === 1 && r.status === 'Paid');
  }

  isPrinted(requestId: string): boolean {
    if (!requestId) return false;
    return localStorage.getItem(`udsm-transcript-printed-${requestId}`) === 'true';
  }

  printTranscript(request?: any): void {
    if (!request) return;
    const user = this.authService.getCurrentUser();
    if (!user) return;

    localStorage.setItem(`udsm-transcript-printed-${request.id}`, 'true');

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
    <button class="btn-print" onclick="window.print()">🖨️ Print Transcript</button>
  </div>
</body>
</html>`;

    try {
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, '_blank');
      if (!win) {
        alert('Please allow popups to print your transcript.');
      }
    } catch (e) {
      console.error('Error printing transcript:', e);
    }
  }
}
