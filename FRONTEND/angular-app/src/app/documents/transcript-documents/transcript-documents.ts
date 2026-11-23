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
  readonly requiredDocuments = [
    'Birth Certificate',
    'O-Level Certificate',
    'A-Level Certificate'
  ];
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
      for (const category of this.requiredDocuments) this.uploaded[category] = uploadedCategories.has(category.toLowerCase());
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
    return this.requiredDocuments.every(category => this.uploaded[category]);
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }
}
