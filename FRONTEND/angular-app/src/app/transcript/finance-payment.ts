import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { NotificationService } from '../core/services/notification.service';
import { TranscriptPaymentService } from '../core/services/transcript-payment.service';
import { ToastService } from '../core/services/toast.service';
import { TranscriptPaymentRequest } from './transcript-payment.model';
import { sortTranscriptRequestsForFinance } from './finance-payment.utils';

@Component({
  selector: 'app-transcript-finance-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './finance-payment.html',
  styleUrl: './finance-payment.css'
})
export class TranscriptFinancePaymentComponent {
  private readonly authService = inject(AuthService);
  private readonly paymentService = inject(TranscriptPaymentService);
  private readonly notificationService = inject(NotificationService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  controlNumbers: Record<string, string> = {};
  private queuedRequests: TranscriptPaymentRequest[] = [];
  message = '';
  selectedQueue: 'queue1' | 'queue2' | 'history' = 'queue1';

  setQueueFilter(queue: 'queue1' | 'queue2' | 'history'): void {
    this.selectedQueue = queue;
  }

  constructor() {
    if (this.authService.getCurrentUser()?.role !== 'Finance') {
      this.router.navigate(['/login']);
      return;
    }

    this.refreshRequests();
  }

  get requests(): TranscriptPaymentRequest[] {
    return this.queuedRequests;
  }

  get controlNumberRequests(): TranscriptPaymentRequest[] {
    return this.requests.filter(request => request.status === 'Pending Control Number');
  }

  get receiptRequests(): TranscriptPaymentRequest[] {
    return this.requests.filter(request => request.status === 'Receipt Submitted');
  }

  get verifiedRequests(): TranscriptPaymentRequest[] {
    return this.requests.filter(request => request.status === 'Paid');
  }

  issueControlNumber(request: TranscriptPaymentRequest): void {
    this.message = '';
    const value = this.controlNumbers[request.id]?.trim();
    if (!value) {
      this.toastService.warning('Input Required', 'Enter a control number before issuing it.');
      return;
    }

    if (!this.paymentService.issueControlNumber(request.id, value)) {
      this.toastService.error('Action Failed', 'This request is no longer waiting for a control number.');
      return;
    }

    this.notificationService.createNotification(
        request.studentId,
        'Transcript control number issued',
        `Finance issued control number ${value} for your TSh ${request.amount.toLocaleString()} transcript payment.`,
        'success'
    );
    this.controlNumbers[request.id] = '';
    this.toastService.success('Success', `Control number issued to ${request.studentName}.`);
    this.refreshRequests();
  }

  markPaid(request: TranscriptPaymentRequest): void {
    if (!this.paymentService.updateStatus(request.id, 'Paid')) {
      this.toastService.error('Action Failed', 'Unable to verify this receipt.');
      return;
    }
    this.toastService.success('Success', `Payment verified for ${request.studentName}.`);
    this.refreshRequests();
  }

  getFormattedFileName(studentName: string): string {
    const sanitized = (studentName || 'STUDENT')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .replace(/\s+/g, '-');
    return `${sanitized}.pdf`;
  }

  generateReceiptHtml(request: TranscriptPaymentRequest): string {
    const date = request.receiptSubmittedAt
      ? new Date(request.receiptSubmittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const formattedAmount = (request.amount || 0).toLocaleString();
    const verificationCode = `UDSM-FIN-${(request.id || 'RECT').substring(0, 8).toUpperCase()}`;
    const studentName = request.studentName || 'N/A';
    const regNo = request.registrationNumber || 'N/A';
    const controlNo = request.controlNumber || 'N/A';
    const award = request.award || 'N/A';
    const gradYear = request.graduationYear || 'N/A';
    const count = request.transcriptCount || 1;

    const receiptImgHtml = (request.receiptData && request.receiptData !== 'IMAGE_TOO_LARGE_PLACEHOLDER')
      ? `<div class="image-section">
           <h3>Uploaded Receipt Proof</h3>
           <img src="${request.receiptData}" class="receipt-img" alt="Uploaded Payment Receipt" />
         </div>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt_${regNo}.pdf</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1e293b; background: #f8fafc; line-height: 1.6; }
    .receipt-container { max-width: 780px; margin: 0 auto; background: #ffffff; padding: 36px; border: 1px solid #cbd5e1; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    .header { text-align: center; border-bottom: 2px solid #003b5c; padding-bottom: 18px; margin-bottom: 24px; }
    .institution { font-size: 20px; font-weight: 800; color: #003b5c; letter-spacing: 0.5px; }
    .office { font-size: 12px; font-weight: 700; color: #00679b; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
    .doc-title { font-size: 16px; font-weight: 800; margin-top: 14px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge { display: inline-block; margin-top: 8px; padding: 4px 12px; background: #dcfce7; color: #15803d; border: 1px solid #86efac; border-radius: 20px; font-size: 12px; font-weight: 800; }

    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
    .details-table th, .details-table td { padding: 9px 12px; border: 1px solid #e2e8f0; text-align: left; }
    .details-table th { background: #f1f5f9; color: #334155; font-weight: 700; width: 35%; }
    .details-table td { color: #0f172a; font-weight: 600; }

    .image-section { text-align: center; margin: 20px 0; padding: 16px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; }
    .image-section h3 { font-size: 13px; color: #475569; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .receipt-img { max-width: 100%; max-height: 400px; object-fit: contain; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }

    .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b; }
    .no-print { text-align: center; margin-top: 24px; }
    .btn-print { padding: 10px 24px; background: #00679b; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.2s; }
    .btn-print:hover { background: #003b5c; }

    @media print {
      body { background: #ffffff; padding: 0; }
      .receipt-container { border: none; box-shadow: none; padding: 10px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div class="institution">UNIVERSITY OF DAR ES SALAAM</div>
      <div class="office">FINANCE & ACCOUNTING OFFICE</div>
      <div class="doc-title">OFFICIAL TRANSCRIPT PAYMENT RECEIPT</div>
      <div class="badge">✔ VERIFIED & PAID</div>
    </div>

    <table class="details-table">
      <tr><th>Student Name</th><td>${studentName}</td></tr>
      <tr><th>Registration Number</th><td>${regNo}</td></tr>
      <tr><th>Control Number</th><td>${controlNo}</td></tr>
      <tr><th>Award / Degree</th><td>${award}</td></tr>
      <tr><th>Graduation Year</th><td>${gradYear}</td></tr>
      <tr><th>Transcripts Requested</th><td>${count} copy (${count === 1 ? 'Single copy' : count + ' copies'})</td></tr>
      <tr><th>Total Amount Paid</th><td>TSh ${formattedAmount}</td></tr>
      <tr><th>Verification Date</th><td>${date}</td></tr>
    </table>

    ${receiptImgHtml}

    <div class="footer">
      <div>Verification Code: <strong>${verificationCode}</strong></div>
      <div>Smart Clearance MIS - UDSM Finance</div>
    </div>
  </div>

  <div class="no-print">
    <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
  </div>
</body>
</html>`;
  }

  viewReceiptPdf(request: TranscriptPaymentRequest): void {
    const htmlContent = this.generateReceiptHtml(request);
    try {
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, '_blank');
      if (!win) {
        this.toastService.warning('Popup Blocked', 'Please allow popups to view the PDF receipt.');
      }
    } catch (e) {
      console.error('Error opening receipt PDF:', e);
      this.toastService.error('Error', 'Could not open receipt document.');
    }
  }

  downloadReceiptPdf(request: TranscriptPaymentRequest): void {
    const htmlContent = this.generateReceiptHtml(request);
    try {
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = this.getFormattedFileName(request.studentName);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      this.toastService.success('Downloaded', `Receipt downloaded for ${request.studentName}.`);
    } catch (e) {
      console.error('Error downloading receipt PDF:', e);
      this.toastService.error('Error', 'Could not download receipt document.');
    }
  }

  private refreshRequests(): void {
    this.queuedRequests = sortTranscriptRequestsForFinance(
      this.paymentService.getAllRequests()
        .filter(request => request.status === 'Pending Control Number' || request.status === 'Receipt Submitted' || request.status === 'Paid')
    );
  }
}