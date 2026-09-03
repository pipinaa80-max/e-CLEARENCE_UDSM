import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { TranscriptPaymentService } from '../core/services/transcript-payment.service';

@Component({
  selector: 'app-transcript-collection',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './collection.html',
  styleUrl: './collection.css'
})
export class TranscriptCollectionComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly paymentService = inject(TranscriptPaymentService);
  private readonly router = inject(Router);

  message = '';
  form = this.fb.nonNullable.group({
    collectionMethod: ['' as 'Physical Collection' | 'Post' | '', Validators.required],
    postingAddress: ['']
  });

  get request() {
    const user = this.authService.getCurrentUser();
    return user ? this.paymentService.getStudentRequests(user.id).at(-1) ?? null : null;
  }

  get isPost(): boolean {
    return this.form.controls.collectionMethod.value === 'Post';
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
      collectionMethod: this.request.collectionMethod ?? '',
      postingAddress: this.request.postingAddress ?? ''
    });
  }

  save(): void {
    this.message = '';
    const method = this.form.controls.collectionMethod.value;
    const address = this.form.controls.postingAddress.value.trim();

    if (!method || (method === 'Post' && !address)) {
      this.form.markAllAsTouched();
      this.message = method === 'Post'
        ? 'Enter the address where the transcript should be posted.'
        : 'Select a transcript collection method.';
      return;
    }

    if (!this.request || !this.paymentService.updateCollection(this.request.id, method, address)) {
      this.message = 'Unable to save your collection preference.';
      return;
    }

    this.message = 'Transcript collection preference saved successfully.';
  }
}
