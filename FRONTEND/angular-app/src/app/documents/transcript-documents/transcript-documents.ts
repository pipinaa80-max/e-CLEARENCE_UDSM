import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DocumentService } from '../../core/services/document.service';
import { TranscriptPaymentService } from '../../core/services/transcript-payment.service';
import { ToastService } from '../../core/services/toast.service';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-transcript-documents',
  standalone: true,
  imports: [CommonModule, RouterLink, DashboardHeaderComponent],
  templateUrl: './transcript-documents.html',
  styleUrl: './transcript-documents.css'
})
export class TranscriptDocumentsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly documentService = inject(DocumentService);
  private readonly paymentService = inject(TranscriptPaymentService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly changeDetector = inject(ChangeDetectorRef);

  sidebarOpen = false;

  get isPostgraduate(): boolean {
    const user = this.currentUser;
    if (!user) return false;
    if (user.isPostgraduate) return true;
    const award = (user.award || '').toLowerCase();
    const prog = (user.programme || '').toLowerCase();
    return award.includes('postgraduate') || award.includes('master') || award.includes('phd') || award.includes('doctor') ||
           prog.includes('postgraduate') || prog.includes('master') || prog.includes('msc') || prog.includes('mba') || prog.includes('phd') || prog.includes('doctor');
  }

  entryQualificationType: 'A-Level' | 'Diploma' = 'A-Level';

  get requiredDocuments(): string[] {
    const entryDoc = this.entryQualificationType === 'Diploma'
      ? 'Diploma Certificate'
      : 'A-Level Certificate';

    const list = [
      'Birth Certificate',
      'O-Level Certificate',
      entryDoc
    ];
    if (this.isPostgraduate) {
      list.push('Undergraduate Certificate');
    }
    return list;
  }

  setEntryQualificationType(type: 'A-Level' | 'Diploma'): void {
    if (this.isSubmitted) return;
    this.entryQualificationType = type;
    const user = this.currentUser;
    if (user) {
      localStorage.setItem(`udsm-entry-qualification-${user.id}`, type);
    }
    this.changeDetector.detectChanges();
  }

  selectedFiles: Record<string, File | null> = {};
  uploaded: Record<string, boolean> = {};
  message = '';
  uploading = '';
  paymentId = '';
  submitted = false;
  loading = true;

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get isSubmitted(): boolean {
    return this.submitted;
  }

  async ngOnInit(): Promise<void> {
    const user = this.currentUser;
    if (!user || user.role !== 'Student') {
      this.router.navigate(['/login']);
      return;
    }

    // Auto-detect entry qualification from past selection
    const savedEntry = localStorage.getItem(`udsm-entry-qualification-${user.id}`);
    if (savedEntry === 'Diploma') {
      this.entryQualificationType = 'Diploma';
    } else {
      this.entryQualificationType = 'A-Level';
    }

    try {
      await this.paymentService.refreshStudentControlNumberRequests();
      const payment = this.paymentService.getStudentRequests(user.id)
        .filter(request => request.serverManaged && request.status === 'Paid')
        .at(-1);
      if (!payment?.paymentBatchId) {
        this.router.navigate(['/dashboard/student']);
        return;
      }
      this.paymentId = payment.paymentBatchId;
      const categories = await firstValueFrom(this.documentService.getTranscriptDocumentCategories(this.paymentId));
      const uploadedCategories = new Set(categories.map(category => String(category).trim().toLowerCase()));

      if (uploadedCategories.has('diploma certificate') && !uploadedCategories.has('a-level certificate')) {
        this.entryQualificationType = 'Diploma';
      }

      for (const category of ['Birth Certificate', 'O-Level Certificate', 'A-Level Certificate', 'Diploma Certificate', 'Undergraduate Certificate']) {
        this.uploaded[category] = uploadedCategories.has(category.toLowerCase());
      }

      if (this.allUploaded) {
        localStorage.setItem(`udsm-transcript-documents-${user.id}`, 'Uploaded');
      }

      this.loading = false;
      this.changeDetector.detectChanges();
    } catch {
      this.loading = false;
      this.message = 'Unable to verify payment approval and previously uploaded documents. Refresh and try again.';
      this.changeDetector.detectChanges();
    }
  }

  onFileSelected(category: string, event: Event): void {
    if (this.isSubmitted || this.loading) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (file && !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      this.toastService.warning('Invalid Format', 'Please upload a PDF, JPG or PNG file.');
      input.value = '';
      return;
    }

    this.selectedFiles[category] = file;
  }

  upload(category: string): void {
    if (this.isSubmitted || this.loading || !this.paymentId || this.uploading) return;
    const user = this.currentUser;
    const file = this.selectedFiles[category];
    if (!user || !file) {
      this.toastService.warning('Missing File', `Select the ${category} file first.`);
      return;
    }

    this.uploading = category;

    // Cache undergraduate certificate for Research Supervisor review
    if (category === 'Undergraduate Certificate') {
      const reader = new FileReader();
      reader.onload = () => {
        const certUrl = reader.result as string;
        if (user) {
          user.undergraduateCertificateUrl = certUrl;
          try {
            localStorage.setItem(`udsm-pg-cert-${user.id}`, certUrl);
          } catch {}
        }
      };
      reader.readAsDataURL(file);
    }

    this.documentService.uploadDocument({
      studentId: user.id,
      fileName: file.name,
      fileType: category,
      fileSize: file.size,
      description: `Transcript document for payment request ${this.paymentId}`
    }, file).subscribe({
      next: () => {
        this.uploaded[category] = true;
        this.uploading = '';
        this.toastService.success('Upload Success', `${category} uploaded successfully.`);
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.uploading = '';
        this.toastService.error('Upload Failed', 'The document was not saved. Check your connection and try again.');
        this.changeDetector.detectChanges();
      }
    });
  }

  async submit(): Promise<void> {
    const user = this.currentUser;
    if (!user || !this.allUploaded || !this.paymentId || this.loading) return;
    this.loading = true;
    try {
      const complete = await firstValueFrom(this.documentService.hasRequiredTranscriptDocuments(this.paymentId));
      if (!complete) {
        this.message = 'The server could not confirm all required documents. Please check each upload.';
        return;
      }
      localStorage.setItem(`udsm-transcript-documents-${user.id}`, 'Uploaded');
      localStorage.setItem(`udsm-transcript-documents-submitted-${user.id}`, 'true');
      this.submitted = true;
      this.router.navigate(['/transcript/process']);
    } catch {
      this.message = 'Unable to verify your documents. Please try again.';
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }

  get allUploaded(): boolean {
    const hasBirth = !!this.uploaded['Birth Certificate'];
    const hasOLevel = !!this.uploaded['O-Level Certificate'];
    const hasEntry = this.entryQualificationType === 'Diploma'
      ? !!this.uploaded['Diploma Certificate']
      : !!this.uploaded['A-Level Certificate'];
    const hasUndergrad = !this.isPostgraduate || !!this.uploaded['Undergraduate Certificate'];

    return hasBirth && hasOLevel && hasEntry && hasUndergrad;
  }

  getDocumentDescription(category: string): string {
    if (this.uploaded[category]) {
      return 'Document uploaded and attached successfully.';
    }
    if (this.isSubmitted) {
      return 'Documentation review in progress.';
    }
    switch (category) {
      case 'Birth Certificate':
        return 'Official Certificate of Birth issued by RITA or designated civil registration authority.';
      case 'O-Level Certificate':
        return 'National Examinations Council of Tanzania (NECTA) CSEE / Form IV Certificate.';
      case 'A-Level Certificate':
        return 'Advanced Certificate of Secondary Education Examination (ACSEE / Form VI) for Direct Entry students.';
      case 'Diploma Certificate':
        return 'Ordinary Diploma Certificate (NACTE / NTA Level 6 or equivalent) for Equivalent Entry students.';
      case 'Undergraduate Certificate':
        return 'Prior Bachelor Degree / Undergraduate Certificate for Research Supervisor verification.';
      default:
        return 'Choose the required document to continue.';
    }
  }

  viewDocument(category: string): void {
    const file = this.selectedFiles[category];
    if (file) {
      const url = URL.createObjectURL(file);
      window.open(url, '_blank');
    } else {
      this.toastService.info('Document Verified', `${category} is on file and ready.`);
    }
  }

  removeDocument(category: string): void {
    if (this.isSubmitted) return;
    this.uploaded[category] = false;
    delete this.selectedFiles[category];
    const user = this.currentUser;
    if (user) {
      const set = this.getLocalCategories(user.id, this.paymentId);
      set.delete(category.toLowerCase());
      localStorage.setItem(`udsm-transcript-doc-cats-${user.id}-${this.paymentId}`, JSON.stringify(Array.from(set)));
      localStorage.removeItem(`udsm-transcript-documents-${user.id}`);
      if (category === 'Undergraduate Certificate') {
        user.undergraduateCertificateUrl = '';
        try {
          localStorage.removeItem(`udsm-pg-cert-${user.id}`);
        } catch {}
      }
    }
    this.toastService.info('Document Removed', `${category} has been removed.`);
    this.changeDetector.detectChanges();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }
}
