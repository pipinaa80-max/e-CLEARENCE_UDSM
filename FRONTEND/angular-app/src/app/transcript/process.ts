import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { TranscriptPaymentService } from '../core/services/transcript-payment.service';
import { TranscriptPaymentStatus } from './transcript-payment.model';

@Component({
  selector: 'app-transcript-process',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './process.html',
  styleUrl: './process.css'
})
export class TranscriptProcessComponent {
  private readonly authService = inject(AuthService);
  private readonly paymentService = inject(TranscriptPaymentService);
  private readonly router = inject(Router);

  get request() {
    const user = this.authService.getCurrentUser();
    return user ? this.paymentService.getStudentRequests(user.id).at(-1) ?? null : null;
  }

  get hasApproval(): boolean {
    const user = this.authService.getCurrentUser();
    return !!user && localStorage.getItem(`udsm-transcript-decision-${user.id}`) === 'Approved';
  }

  get paymentStatus(): TranscriptPaymentStatus | 'Not Started' {
    return this.request?.status ?? 'Not Started';
  }

  get paymentApproved(): boolean {
    return this.paymentStatus === 'Paid';
  }

  get documentsReady(): boolean {
    return localStorage.getItem(`udsm-transcript-documents-${this.authService.getCurrentUser()?.id}`) === 'Uploaded';
  }

  get documentsSubmitted(): boolean {
    return localStorage.getItem(`udsm-transcript-documents-submitted-${this.authService.getCurrentUser()?.id}`) === 'true';
  }

  get collectionMethodSaved(): boolean {
    return !!this.request?.collectionMethod;
  }

  get processSteps() {
    let paymentStepStatus = 'Pending';
    if (this.paymentApproved) {
      paymentStepStatus = 'Approved';
    } else if (this.paymentStatus === 'Receipt Submitted') {
      paymentStepStatus = 'Waiting for Approval';
    }

    return [
      {
        number: 1,
        label: 'Transcript Payment',
        detail: 'Pay the required TSh 15,000 transcript fee.',
        status: paymentStepStatus,
        route: '/transcript/payment'
      },
      {
        number: 2,
        label: 'Upload Documentation',
        detail: 'Upload and review your required documents.',
        status: this.documentsSubmitted ? 'Approved' : (this.paymentApproved ? 'Pending' : 'Locked'),
        route: '/documents/transcript'
      },
      {
        number: 3,
        label: 'Transcript Collection',
        detail: 'Choose physical collection or post by DHL.',
        status: this.collectionMethodSaved ? 'Approved' : (this.documentsSubmitted ? 'Pending' : 'Locked'),
        route: '/transcript/collection'
      }
    ];
  }

  get currentStageLabel(): string {
    if (this.collectionMethodSaved) return 'Process Completed';
    if (this.documentsSubmitted) return 'Step 3: Transcript Collection';
    if (this.paymentApproved) return 'Step 2: Upload Documentation';
    if (this.paymentStatus === 'Receipt Submitted') return 'Step 1: Waiting for Payment Approval';
    return 'Step 1: Transcript Payment';
  }

  generateTranscript(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    const transcriptWindow = window.open('', '_blank');
    if (!transcriptWindow) {
      alert('Please allow popups to acquire your transcript.');
      return;
    }

    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const regNo = user.registrationNumber || 'N/A';
    const fullName = user.fullName || 'N/A';
    const programme = user.programme || 'Bachelor of Science in Business Information Technology';

    transcriptWindow.document.write(`
      <html>
        <head>
          <title>Academic Transcript - ${regNo}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #0864af; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 800; color: #0864af; margin-bottom: 5px; }
            .sub-logo { font-size: 14px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 1px; }
            .title { font-size: 20px; font-weight: 800; margin-top: 20px; text-decoration: underline; }

            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .info-item { font-size: 14px; }
            .info-item strong { display: inline-block; width: 150px; }

            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
            th { background: #f4f7fb; text-align: left; padding: 10px; border: 1px solid #ddd; }
            td { padding: 10px; border: 1px solid #ddd; }

            .summary { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 15px; text-align: right; }
            .footer { margin-top: 50px; font-size: 12px; color: #777; display: flex; justify-content: space-between; }
            .signature { margin-top: 40px; text-align: center; width: 200px; border-top: 1px solid #333; padding-top: 5px; font-weight: 700; }

            @media print {
              .no-print { display: none; }
              body { padding: 0; }
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
            <div class="info-item"><strong>NAME:</strong> ${fullName.toUpperCase()}</div>
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
            <div>Generated by Smart Clearance MIS</div>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 60px;">
            <div class="signature">Registrar (Academic)</div>
          </div>

          <div class="no-print" style="margin-top: 40px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #0864af; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-weight: 700;">Print to PDF</button>
          </div>
        </body>
      </html>
    `);
    transcriptWindow.document.close();
  }

  constructor() {
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'Student') {
      this.router.navigate(['/login']);
    }
  }
}
