import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { DocumentService } from '../../core/services/document.service';
import { ToastService } from '../../core/services/toast.service';
import { isPostgraduateEntity } from '../../core/utils/postgraduate.util';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';
import { StudentSidebarComponent } from '../../shared/components/student-sidebar/student-sidebar';

@Component({
  selector: 'app-document-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DashboardHeaderComponent, StudentSidebarComponent],
  templateUrl: './upload.html',
  styleUrl: './upload.css'
})
export class DocumentUploadComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly documentService = inject(DocumentService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  sidebarOpen = false;
  missingCategories: string[] = [];
  selectedFile: File | null = null;
  isSubmitting = false;

  uploadForm = this.fb.group({
    category: ['', Validators.required]
  });

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get isPostgraduate(): boolean {
    return isPostgraduateEntity(this.currentUser);
  }

  get categories(): string[] {
    const base = [
      'Birth Certificate',
      'O-Level Certificate',
      'A-Level Certificate',
      'Diploma Certificate'
    ];
    if (this.isPostgraduate) {
      base.push('Undergraduate Certificate');
    }
    return base;
  }

  ngOnInit(): void {
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    this.missingCategories = [...this.categories];
    this.uploadForm.patchValue({ category: this.missingCategories[0] || '' });
    this.loadUploadedDocuments();
  }

  loadUploadedDocuments(): void {
    const user = this.currentUser;
    if (!user) return;

    this.documentService.getStudentDocuments(user.id, 0, 50).subscribe({
      next: (response) => {
        const uploaded = new Set(
          (response?.content || []).map(d => String(d.category || d.description || '').trim().toLowerCase())
        );
        this.missingCategories = this.categories.filter(c => !uploaded.has(c.toLowerCase()));
        if (this.missingCategories.length > 0) {
          this.uploadForm.patchValue({ category: this.missingCategories[0] });
        } else {
          this.uploadForm.patchValue({ category: '' });
        }
      },
      error: () => {
        this.missingCategories = [...this.categories];
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

    const user = this.currentUser;
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
        category,
        description: category
      },
      this.selectedFile
    ).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toastService.success('Uploaded', `${category} uploaded successfully.`);
        this.selectedFile = null;
        this.loadUploadedDocuments();
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err.error?.message || err.message || 'Failed to upload document.';
        this.toastService.error('Upload Error', msg);
      }
    });
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }
}
