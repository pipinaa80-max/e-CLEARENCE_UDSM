import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DocumentService } from '../../core/services/document.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-documents-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormsModule],
  templateUrl: './upload.html',
  styleUrl: './upload.css'
})
export class DocumentsUploadComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly documentService = inject(DocumentService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly categories = [
    'Admission Letter',
    'Birth Certificate',
    'Identity Document',
    'Tuition Fee Receipts'
  ];

  readonly identityHelp = 'Voter ID, Passport, National ID, or Driving License';

  missingCategories: string[] = [];
  errorMessage = '';
  successMessage = '';
  selectedFile: File | null = null;

  uploadForm = this.fb.nonNullable.group({
    category: ['', Validators.required]
  });

  ngOnInit(): void {
    this.loadMissingCategories();
  }

  private loadMissingCategories(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.documentService.getMissingDocuments(user.id).subscribe({
      next: (categories) => {
        this.missingCategories = categories;
        if (categories.length > 0) {
          this.uploadForm.patchValue({ category: categories[0] });
        }
      },
      error: () => {
        // Fallback for mock/demo
        this.missingCategories = [...this.categories];
        this.uploadForm.patchValue({ category: this.categories[0] });
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  submit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const user = this.authService.getCurrentUser();
    if (!user || !this.selectedFile) {
      this.errorMessage = 'Please select a file to upload.';
      return;
    }

    const { category } = this.uploadForm.getRawValue();

    this.documentService.uploadDocument({
      studentId: user.id,
      fileName: this.selectedFile.name,
      fileType: this.selectedFile.type,
      fileSize: this.selectedFile.size,
      description: category
    }, this.selectedFile).subscribe({
      next: () => {
        this.successMessage = `${category} uploaded successfully.`;
        this.selectedFile = null;
        this.loadMissingCategories();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Upload failed. Please try again.';
      }
    });
  }
}
