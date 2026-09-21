import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DocumentService } from '../../core/services/document.service';
import { TranscriptPaymentService } from '../../core/services/transcript-payment.service';
import { ToastService } from '../../core/services/toast.service';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

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

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get isSubmitted(): boolean {
    const user = this.currentUser;
    return !!user && localStorage.getItem(`udsm-transcript-documents-submitted-${user.id}`) === 'true';
  }

  ngOnInit(): void {
    const user = this.currentUser;
    const payment = user
      ? this.paymentService.getStudentRequests(user.id).at(-1)
      : null;

    if (!user || user.role !== 'Student') {
      this.router.navigate(['/login']);
      return;
    }

    if (!payment || payment.status !== 'Paid') {
      this.router.navigate(['/transcript/payment']);
      return;
    }

    this.paymentId = payment.id;
    for (const category of this.requiredDocuments) {
      this.uploaded[category] = false;
    }

    this.documentService.getDocumentCategories(user.id).subscribe({
      next: categories => {
        const uploadedCategories = categories.map(category => String(category));
        for (const category of categories) {
          if (this.requiredDocuments.includes(category)) {
            this.uploaded[category] = true;
          }
        }
        if (uploadedCategories.length >= this.requiredDocuments.length) {
          for (const category of this.requiredDocuments) {
            this.uploaded[category] = true;
          }
        }
        if (this.allUploaded) {
          localStorage.setItem(`udsm-transcript-documents-${user.id}`, 'Uploaded');
        }
      },
      error: () => {
        this.toastService.error('Load Error', 'Unable to load previously uploaded documents.');
      }
    });
  }

  onFileSelected(category: string, event: Event): void {
    if (this.isSubmitted) return;
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
    if (this.isSubmitted) return;
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
        if (this.allUploaded) {
          localStorage.setItem(`udsm-transcript-documents-${user.id}`, 'Uploaded');
        }
        this.uploading = '';
        this.toastService.success('Upload Success', `${category} uploaded successfully.`);
      },
      error: (error: Error) => {
        this.uploading = '';
        this.toastService.error('Upload Failed', error.message || `Unable to upload ${category}.`);
      }
    });
  }

  submit(): void {
    const user = this.currentUser;
    if (!user || !this.allUploaded) return;

    localStorage.setItem(`udsm-transcript-documents-submitted-${user.id}`, 'true');
    this.router.navigate(['/transcript/process']);
  }

  get allUploaded(): boolean {
    return this.requiredDocuments.every(category => this.uploaded[category]);
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }
}
