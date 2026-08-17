import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DocumentService } from '../../core/services/document.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({ selector: 'app-document-upload', standalone: true, imports: [CommonModule, ReactiveFormsModule, RouterLink], templateUrl: './upload.html', styleUrl: './upload.css' })
export class DocumentUploadComponent {
  private readonly fb = inject(FormBuilder); private readonly authService = inject(AuthService); private readonly documentService = inject(DocumentService); private readonly clearanceService = inject(ClearanceService); private readonly notificationService = inject(NotificationService); private readonly router = inject(Router);
  readonly categories = ['Transcript', 'O-Level Certificate', 'A-Level Certificate', 'Identity Document'];
  readonly identityHelp = 'National ID, Voter ID, Driving Licence, Passport, or Employee ID';
  uploadForm = this.fb.nonNullable.group({ category: ['Transcript', Validators.required], file: [null as File | null, Validators.required] });
  errorMessage = ''; successMessage = '';
  get user() { return this.authService.getCurrentUser(); }
  get documents() { return this.user ? this.documentService.getStudentDocuments(this.user.id) : []; }
  get missingCategories(): string[] { const uploaded = this.documents.map((document) => document.fileType); return this.categories.filter((category) => !uploaded.includes(category)); }
  onFileSelected(event: Event): void { this.uploadForm.controls.file.setValue((event.target as HTMLInputElement).files?.[0] ?? null); }
  submit(): void {
    this.errorMessage = ''; this.successMessage = ''; const user = this.user;
    if (!user) { this.router.navigate(['/login']); return; }
    if (this.uploadForm.invalid) { this.errorMessage = 'Choose a document category and file first.'; return; }
    const file = this.uploadForm.controls.file.value!; const category = this.uploadForm.controls.category.value;
    if (this.documents.some((document) => document.fileType === category)) { this.errorMessage = `${category} has already been uploaded.`; return; }
    this.documentService.uploadDocument({ studentId:user.id, fileName:file.name, fileType:category, fileSize:file.size, fileUrl:'' });
    this.uploadForm.controls.file.setValue(null); this.uploadForm.controls.category.setValue(this.missingCategories[0] ?? 'Transcript'); this.successMessage = `${category} uploaded successfully.`;
    if (this.documentService.hasRequiredClearanceDocuments(user.id)) { const draft = this.clearanceService.getDraft(user.id); if (draft) { const profile = draft.academicProfile; if (profile?.college && profile.department && profile.programme) { user.college = profile.college; user.department = profile.department; user.programme = profile.programme; this.authService.updateCurrentUser(user); } this.clearanceService.createRequest({ studentId:user.id, college:user.college, department:user.department, programme:user.programme, clearanceType:draft.clearanceType, remarks:draft.remarks }); this.clearanceService.clearDraft(user.id); this.notificationService.createNotification(user.id, 'Credentials saved and request submitted', 'Your profile has been updated and your clearance request has been sent for review.', 'success'); this.router.navigate(['/profile']); } }
  }
}
