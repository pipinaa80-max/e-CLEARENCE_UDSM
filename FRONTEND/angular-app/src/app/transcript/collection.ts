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
      postingAddress: this.request.postingAddress ?? ''
    });
  }

  save(): void {
    this.message = '';
    const method = this.form.controls.collectionMethod.value;
    const address = this.form.controls.postingAddress.value.trim();

    if (!method || (method === 'Post by DHL' && !address)) {
      this.form.markAllAsTouched();
      this.message = method === 'Post by DHL'
        ? 'Enter the address where the transcript should be posted.'
        : 'Select a transcript collection method.';
      return;
    }

    if (!this.request || !this.paymentService.updateCollection(this.request.id, method, address)) {
      this.message = 'Unable to save your collection preference.';
      return;
    }

    this.message = 'Transcript collection preference saved successfully.';
    setTimeout(() => this.router.navigate(['/transcript/process']), 2000);
  }
}
