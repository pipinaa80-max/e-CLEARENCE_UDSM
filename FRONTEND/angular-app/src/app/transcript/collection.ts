import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { TranscriptPaymentService } from '../core/services/transcript-payment.service';
import { DashboardHeaderComponent } from '../shared/components/dashboard-header/dashboard-header';

@Component({
  selector: 'app-transcript-collection',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RouterLinkActive, DashboardHeaderComponent],
  templateUrl: './collection.html',
  styleUrl: './collection.css'
})
export class TranscriptCollectionComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly paymentService = inject(TranscriptPaymentService);
  private readonly router = inject(Router);

  sidebarOpen = false;
  message = '';

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
  form = this.fb.nonNullable.group({
    collectionMethod: ['' as 'Physical Collection' | 'Post by DHL' | '', Validators.required],
    postingRegion: [''],
    postingWard: [''],
    postingPoBox: [''],
    postingContactPhone: [''],
    postingContactEmail: [''],
    postingAddress: ['']
  });

  get request() {
    const user = this.authService.getCurrentUser();
    return user ? this.paymentService.getStudentRequests(user.id).at(-1) ?? null : null;
  }

  get isPost(): boolean {
    return this.form.controls.collectionMethod.value === 'Post by DHL';
  }

  constructor() {
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'Student') {
      this.router.navigate(['/login']);
      return;
    }

    if (!this.request || this.request.status !== 'Paid') {
      this.router.navigate(['/transcript/payment']);
      return;
    }

    this.form.patchValue({
      collectionMethod: (this.request.collectionMethod as any === 'Post' ? 'Post by DHL' : this.request.collectionMethod) ?? '',
      postingRegion: this.request.postingRegion ?? '',
      postingWard: this.request.postingWard ?? '',
      postingPoBox: this.request.postingPoBox ?? '',
      postingContactPhone: this.request.postingContactPhone ?? (user.phoneNumber || user.phone || ''),
      postingContactEmail: this.request.postingContactEmail ?? (user.email || ''),
      postingAddress: this.request.postingAddress ?? ''
    });
  }

  save(): void {
    this.message = '';
    const val = this.form.getRawValue();
    const method = val.collectionMethod;

    if (!method) {
      this.form.markAllAsTouched();
      this.message = 'Please select a transcript collection method.';
      return;
    }

    if (method === 'Post by DHL') {
      if (!val.postingRegion.trim() || !val.postingWard.trim() || !val.postingPoBox.trim() || !val.postingContactPhone.trim()) {
        this.form.markAllAsTouched();
        this.message = 'Please fill out your Region, Ward/District, P.O. Box and Contact Phone Number for DHL delivery.';
        return;
      }
    }

    const fullSummaryAddress = method === 'Post by DHL'
      ? `P.O. Box: ${val.postingPoBox.trim()}, Ward/District: ${val.postingWard.trim()}, Region/City: ${val.postingRegion.trim()}. Contact Phone: ${val.postingContactPhone.trim()}, Email: ${val.postingContactEmail.trim()}. Notes: ${val.postingAddress.trim()}`
      : 'Physical Collection at University Directorate of Undergraduate Studies Office';

    if (!this.request || !this.paymentService.updateCollectionDetails(
      this.request.id,
      method,
      fullSummaryAddress,
      val.postingRegion.trim(),
      val.postingWard.trim(),
      val.postingPoBox.trim(),
      val.postingContactPhone.trim(),
      val.postingContactEmail.trim()
    )) {
      this.message = 'Unable to save your collection preference.';
      return;
    }

    this.message = 'Transcript collection preference saved successfully and forwarded to the Director of Undergraduate Studies.';
    setTimeout(() => this.router.navigate(['/transcript/process']), 2000);
  }
}
