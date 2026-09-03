import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../core/services/auth.service';
import { ClearanceService } from '../core/services/clearance.service';
import { ClearanceRequest } from '../core/models/clearance.model';

@Component({
  selector: 'app-transcript',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './transcript.html',
  styleUrl: './transcript.css'
})
export class TranscriptComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly router = inject(Router);

  request: ClearanceRequest | null = null;
  isSubmitted = false;
  decision: 'Approved' | 'Rejected' | null = null;
  message = '';

  transcriptForm = this.fb.nonNullable.group({
    surname: ['', Validators.required],
    otherNames: ['', Validators.required],
    registrationNumber: ['', Validators.required],
    graduationYear: ['', Validators.required],
    award: ['', Validators.required],
    phone: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    physicalAddress: ['', Validators.required],
    termsAccepted: [false, Validators.requiredTrue]
  });

  readonly graduationYears = ['2024', '2025', '2026', '2027', '2028'];
  readonly awards = [
    'Certificate',
    'Diploma',
    'Bachelor Degree',
    'Postgraduate Diploma',
    'Master Degree',
    'PhD'
  ];

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'Student') {
      this.router.navigate(['/login']);
      return;
    }

    const requests = this.clearanceService.getStudentRequests(user.id);
    this.request = requests.at(-1) ?? null;

    const fullName = this.request?.studentName || user.fullName || '';
    const names = fullName.trim().split(/\s+/).filter(Boolean);
    const surname = names.length ? names[names.length - 1] : '';
    const otherNames = names.slice(0, -1).join(' ');

    this.transcriptForm.patchValue({
      surname,
      otherNames,
      registrationNumber: this.request?.registrationNumber || user.registrationNumber,
      graduationYear: new Date().getFullYear().toString(),
      phone: user.phone,
      email: user.email,
      physicalAddress: this.request?.hall || ''
    });

    const savedDecision = localStorage.getItem(`udsm-transcript-decision-${user.id}`);
    if (savedDecision === 'Approved' || savedDecision === 'Rejected') {
      this.decision = savedDecision;
      this.isSubmitted = true;
      this.transcriptForm.disable();
    }
  }

  get photoSource(): string | null {
    return this.request?.photo?.startsWith('data:image') ? this.request.photo : null;
  }

  approve(): void {
    if (this.transcriptForm.invalid) {
      this.transcriptForm.markAllAsTouched();
      this.message = 'Please complete the form and accept the terms before approving.';
      return;
    }

    this.saveDecision('Approved');
    this.message = 'Transcript request approved. Continue to the payment dashboard to request a control number.';
    this.router.navigate(['/transcript/process']);
  }

  reject(): void {
    if (!this.transcriptForm.value.termsAccepted) {
      this.message = 'Please review and accept the terms before continuing.';
      return;
    }

    this.saveDecision('Rejected');
    this.message = 'Transcript request rejected.';
  }

  private saveDecision(decision: 'Approved' | 'Rejected'): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.decision = decision;
    this.isSubmitted = true;
    localStorage.setItem(`udsm-transcript-decision-${user.id}`, decision);
    localStorage.setItem(`udsm-transcript-request-${user.id}`, JSON.stringify(this.transcriptForm.getRawValue()));
    this.transcriptForm.disable();
  }
}
