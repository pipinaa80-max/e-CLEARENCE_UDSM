import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { DocumentService } from '../../core/services/document.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-document-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './upload.html',
  styleUrl: './upload.css'
})
export class DocumentUploadComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly documentService = inject(DocumentService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly categories = [
    'Identity Document',
    'Academic Transcript',
    'Student ID Card',
    'Payment Receipt'
  ];

  missingCategories = [...this.categories];
  readonly identityHelp = 'National ID (NIDA) or Passport or Voter ID';

  selectedFile: File | null = null;
  isSubmitting = false;

  uploadForm = this.fb.group({
    category: ['', Validators.required]
  });

  ngOnInit(): void {
    this.loadUploadedDocuments();
  }

  loadUploadedDocuments(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.documentService.getStudentDocuments(user.id).subscribe({
      next: (response) => {
        const uploaded = (response?.content || []).map(d => d.category);
        this.missingCategories = this.categories.filter(c => !uploaded.includes(c));
        if (this.missingCategories.length > 0 && !this.uploadForm.value.category) {
          this.uploadForm.patchValue({ category: this.missingCategories[0] });
        }
      },
      error: () => {
        // Fallback to initial missing categories
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
    }
  }

  submit(): void {
    const category = this.uploadForm.value.category;
    if (!category || !this.selectedFile) {
      this.toastService.warning('Validation', 'Please select a document category and choose a file to upload.');
      return;
    }

    const user = this.authService.getCurrentUser();
    if (!user) {
      this.toastService.error('Auth', 'You must be logged in to upload documents.');
      return;
    }

    this.isSubmitting = true;

    this.documentService.uploadDocument(
      {
        studentId: user.id,
        fileName: this.selectedFile.name,
        fileType: this.selectedFile.type,
        fileSize: this.selectedFile.size,
        description: category
      },
      this.selectedFile
    ).subscribe({
      next: (doc) => {
        this.isSubmitting = false;
        this.toastService.success('Uploaded', `${category} uploaded successfully.`);
        this.selectedFile = null;
        this.loadUploadedDocuments();
        if (this.missingCategories.length <= 1) {
          this.router.navigate(['/documents']);
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err.error?.message || err.message || 'Failed to upload document.';
        this.toastService.error('Upload Error', msg);
      }
    });
  }
}
