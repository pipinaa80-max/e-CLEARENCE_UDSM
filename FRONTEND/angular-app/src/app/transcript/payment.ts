import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { TranscriptPaymentService } from '../core/services/transcript-payment.service';
import { ToastService } from '../core/services/toast.service';
import { TranscriptPaymentRequest } from './transcript-payment.model';
import { DashboardHeaderComponent } from '../shared/components/dashboard-header/dashboard-header';

@Component({
  selector: 'app-transcript-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, DashboardHeaderComponent],
  templateUrl: './payment.html',
  styleUrl: './payment.css'
})
export class TranscriptPaymentComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly paymentService = inject(TranscriptPaymentService);
  private readonly toastService = inject(ToastService);

  sidebarOpen = false;
  request: TranscriptPaymentRequest | null = null;
  message = '';
  isSubmitting = false;
  transcriptCount = 1;
  selectedFile: File | null = null;

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
    const requests = this.paymentService.getStudentRequests(user.id);
    return requests.some(r => r.attemptNumber === 1 && r.status === 'Paid');
  }

  get hasApproval(): boolean {
    const user = this.authService.getCurrentUser();
    return !!user && localStorage.getItem(`udsm-transcript-decision-${user.id}`) === 'Approved';
  }

  get isFirstRequest(): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    const requests = this.paymentService.getStudentRequests(user.id);

    if (this.request) {
      return this.request.attemptNumber === 1;
    }

    return requests.length === 0;
  }

  get isStandaloneMode(): boolean {
    return !this.isFirstRequest;
  }

  get nextRequestAmount(): number {
    if (this.isFirstRequest) {
      return 15000;
    }
    return this.transcriptCount * 5000;
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'Student') {
      this.router.navigate(['/login']);
      return;
    }

    const lastRequest = this.paymentService.getStudentRequests(user.id).at(-1) ?? null;

    // A student can ONLY start a new request if there are no requests OR the last request is already Paid/Verified!
    if (!lastRequest || lastRequest.status === 'Paid') {
      this.request = null;
    } else {
      this.request = lastRequest;
    }
  }

  constructor() {
    if (!this.hasApproval) {
      this.router.navigate(['/transcript']);
    }
  }

  requestControlNumber(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    if (!this.request) {
      const savedDetails = JSON.parse(
          localStorage.getItem(`udsm-transcript-request-${user.id}`) || '{}'
      );

      this.request = this.paymentService.createRequest({
        studentId: user.id,
        studentName: `${savedDetails.surname || ''} ${savedDetails.otherNames || ''}`.trim() || user.fullName,
        registrationNumber: savedDetails.registrationNumber || user.registrationNumber,
        award: savedDetails.award || 'Transcript Request',
        graduationYear: savedDetails.graduationYear || new Date().getFullYear().toString(),
        transcriptCount: this.transcriptCount
      });
      this.message = 'Your control number request has been sent to Finance.';
      return;
    }

    if (this.request.status !== 'Pending Control Number') return;
    this.message = 'Your control number request has already been sent to Finance.';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.message = '';

    if (file && file.size > 1.5 * 1024 * 1024) {
      this.toastService.warning('File Too Large', 'This photo is too large for the system to process. Please upload a smaller file or a compressed JPG (Max 1.5MB).');
      this.selectedFile = null;
      input.value = '';
      return;
    }

    this.selectedFile = file;
  }

  submitReceipt(): void {
    if (!this.selectedFile || !this.request) return;

    this.isSubmitting = true;
    this.message = '';

    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const rawBase64 = reader.result as string;
        const compressedBase64 = await this.compressImage(rawBase64);

        const submitted = this.paymentService.submitReceipt(
            this.request!.id,
            this.selectedFile!.name,
            compressedBase64
        );

        if (submitted) {
          this.toastService.success('Success', 'Payment receipt submitted successfully to Finance.');
          const user = this.authService.getCurrentUser();
          if (user) {
            this.request = this.paymentService.getStudentRequests(user.id).at(-1) ?? null;
          }
        } else {
          this.toastService.error('Error', 'Finance could not receive the receipt. Please try again.');
        }
      } catch (error) {
        console.error('Submission failed:', error);
        this.toastService.error('Submission Failed', 'The photo data is too heavy. Please use a smaller photo or screenshot.');
      } finally {
        this.selectedFile = null;
        this.isSubmitting = false;
      }
    };

    reader.onerror = () => {
      this.toastService.error('Read Error', 'Unable to read the receipt photo.');
      this.selectedFile = null;
      this.isSubmitting = false;
    };

    reader.readAsDataURL(this.selectedFile);
  }

  onReceiptSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.request) return;

    if (!file.type.startsWith('image/')) {
      this.toastService.warning('Invalid Format', 'Please upload a photo of the payment receipt.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const rawBase64 = reader.result as string;
      const compressedBase64 = await this.compressImage(rawBase64);

      const submitted = this.paymentService.submitReceipt(
          this.request!.id,
          file.name,
          compressedBase64
      );
      if (!submitted) {
        this.toastService.warning('Action Required', 'Receipt cannot be submitted until Finance issues your control number.');
        return;
      }
      this.request = this.paymentService.getStudentRequests(this.request!.studentId).at(-1) ?? null;
      this.toastService.success('Success', 'Payment receipt submitted successfully.');
    };
    reader.onerror = () => {
      this.toastService.error('Read Error', 'Unable to read the receipt photo.');
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  private compressImage(base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.65): Promise<string> {
    return new Promise((resolve) => {
      if (!base64Str || !base64Str.startsWith('data:image')) {
        resolve(base64Str);
        return;
      }
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => resolve(base64Str);
    });
  }

  isPrinted(requestId?: string): boolean {
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
        this.toastService.warning('Popup Blocked', 'Please allow popups to print your transcript.');
      }
    } catch (e) {
      console.error('Error printing transcript:', e);
      this.toastService.error('Error', 'Could not open transcript document.');
    }
  }
}
