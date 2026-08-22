import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { DocumentService } from '../../core/services/document.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';

import { ClearanceRequest } from '../../core/models/clearance.model';


@Component({
  selector: 'app-convocation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './convocation.html',
  styleUrl: './convocation.css'
})
export class ConvocationComponent {

  private readonly fb =
    inject(FormBuilder);

  private readonly authService =
    inject(AuthService);

  private readonly documentService =
    inject(DocumentService);

  private readonly clearanceService =
    inject(ClearanceService);

  private readonly notificationService =
    inject(NotificationService);

  private readonly router =
    inject(Router);


  // =====================================================
  // STUDENT FORM
  // =====================================================

  form = this.fb.nonNullable.group({

    controlNumber: [
      ''
    ],

    file: [
      null as File | null
    ]

  });


  selectedFileName = '';

  errorMessage = '';

  message = '';

  comment = '';


  // =====================================================
  // CURRENT USER
  // =====================================================

  get currentUser() {

    return this.authService
      .getCurrentUser();

  }


  // =====================================================
  // OFFICER CHECK
  // =====================================================

  get isOfficer(): boolean {

    return (
      this.currentUser?.role ===
      'Convocation'
    );

  }


  // =====================================================
  // STUDENT REQUEST
  // =====================================================

  get studentRequest():
    ClearanceRequest | null {

    const user =
      this.currentUser;


    if (!user) {
      return null;
    }


    return (
      this.clearanceService
        .getStudentRequests(user.id)
        .find(
          request =>
            request.currentStage ===
            'Convocation'
        )
      ?? null
    );

  }


  // =====================================================
  // CONVOCATION REQUESTS
  // =====================================================

  get requests(): ClearanceRequest[] {

    return this.clearanceService
      .getRequestsForOffice(
        'Convocation'
      );

  }


  // =====================================================
  // STUDENT REQUEST CONTROL NUMBER
  // =====================================================

  requestControlNumber(): void {

    this.errorMessage = '';

    this.message = '';


    const request =
      this.studentRequest;


    if (!request) {

      this.errorMessage =
        'No active clearance request was found.';

      return;

    }


    if (
      request.convocation
        ?.controlNumberRequestedAt
    ) {

      this.message =
        'Your control number has already been requested.';

      return;

    }


    this.clearanceService
      .requestControlNumber(
        request.id
      );


    this.message =
      'Control number requested. Please wait for Convocation to issue your control number.';

  }


  // =====================================================
  // CONTROL NUMBER
  // =====================================================

  get controlNumber(): string {

    return (
      this.studentRequest
        ?.convocation
        ?.controlNumber
      ?? ''
    );

  }


  // =====================================================
  // CONTROL NUMBER REQUESTED
  // =====================================================

  get controlNumberRequested(): boolean {

    return !!(
      this.studentRequest
        ?.convocation
        ?.controlNumberRequestedAt
    );

  }


  // =====================================================
  // RECEIPT SUBMITTED
  // =====================================================

  get receiptSubmitted(): boolean {

    return !!(
      this.studentRequest
        ?.convocation
        ?.receiptSubmittedAt
    );

  }


  // =====================================================
  // FILE SELECTED
  // =====================================================

  onFileSelected(
    event: Event
  ): void {

    this.errorMessage = '';

    const input =
      event.target as HTMLInputElement;


    const file =
      input.files?.[0] ?? null;


    this.selectedFileName = '';

    this.form.controls.file
      .setValue(null);


    if (!file) {
      return;
    }


    const allowedTypes = [

      'application/pdf',

      'image/jpeg',

      'image/png'

    ];


    if (
      !allowedTypes.includes(
        file.type
      )
    ) {

      this.errorMessage =
        'Please upload a PDF, JPG, JPEG or PNG receipt.';

      input.value = '';

      return;

    }


    if (
      file.size >
      5 * 1024 * 1024
    ) {

      this.errorMessage =
        'Receipt must not exceed 5 MB.';

      input.value = '';

      return;

    }


    this.selectedFileName =
      file.name;


    this.form.controls.file
      .setValue(file);

  }


  // =====================================================
  // SUBMIT RECEIPT
  // =====================================================

  submit(): void {

    this.errorMessage = '';

    this.message = '';


    const user =
      this.currentUser;


    if (!user) {

      this.router.navigate([
        '/login'
      ]);

      return;

    }


    const request =
      this.studentRequest;


    if (!request) {

      this.errorMessage =
        'No active clearance request was found.';

      return;

    }


    /*
     * The student must have
     * a control number first.
     */
    if (!this.controlNumber) {

      this.errorMessage =
        'Please wait for Convocation to issue your control number.';

      return;

    }


    const file =
      this.form.controls.file.value;


    if (!file) {

      this.errorMessage =
        'Please upload your payment receipt.';

      return;

    }


    this.documentService
      .uploadDocument(

        {

          studentId:
            user.id,

          fileName:
            file.name,

          fileType:
            'Convocation Payment Receipt',

          fileSize:
            file.size,

          description:
            `Payment receipt for control number ${this.controlNumber}`

        },

        file

      )
      .subscribe({

        next: () => {

          this.clearanceService
            .submitConvocationReceipt(

              request.id,

              file.name

            );


          this.notificationService
            .createNotification(

              user.id,

              'Payment receipt submitted',

              'Your payment receipt has been submitted to Convocation for verification.',

              'success'

            );


          this.message =
            'Payment receipt submitted successfully.';


          this.form.controls.file
            .setValue(null);

          this.selectedFileName = '';

        },


        error: () => {

          this.errorMessage =
            'Failed to upload the receipt. Please try again.';

        }

      });

  }


  // =====================================================
  // STAFF — ISSUE CONTROL NUMBER
  // =====================================================

  issueControlNumber(
    request: ClearanceRequest
  ): void {

    this.errorMessage = '';

    this.message = '';


    if (
      request.convocation
        ?.controlNumber
    ) {

      this.message =
        'This request already has a control number.';

      return;

    }


    const controlNumber =
      window.prompt(
        'Enter the control number for this student:'
      );


    if (
      !controlNumber?.trim()
    ) {

      this.errorMessage =
        'Please enter a control number.';

      return;

    }


    this.clearanceService
      .issueControlNumber(

        request.id,

        controlNumber.trim()

      );


    this.notificationService
      .createNotification(

        request.studentId,

        'Control number issued',

        `Convocation has issued your control number: ${controlNumber.trim()}`,

        'success'

      );


    this.message =
      'Control number issued successfully.';

  }


  // =====================================================
  // STAFF — APPROVE
  // =====================================================

  approve(
    request: ClearanceRequest
  ): void {

    this.errorMessage = '';

    this.message = '';


    const staff =
      this.currentUser;


    if (!staff) {

      return;

    }


    if (
      !request.convocation
        ?.receiptSubmittedAt
    ) {

      this.errorMessage =
        'The student must submit a payment receipt before approval.';

      return;

    }


    this.clearanceService
      .approveRequest(

        request.id,

        'Convocation',

        staff.fullName

      );


    this.notificationService
      .createNotification(

        request.studentId,

        'Convocation clearance approved',

        'Your payment receipt has been verified. You can now continue to the clearance offices.',

        'success'

      );


    this.message =
      'Request approved successfully.';

  }


  // =====================================================
  // STAFF — REJECT
  // =====================================================

  reject(
    request: ClearanceRequest
  ): void {

    this.errorMessage = '';

    this.message = '';


    const staff =
      this.currentUser;


    if (!staff) {

      return;

    }


    if (
      !this.comment.trim()
    ) {

      this.errorMessage =
        'Please enter a comment before rejecting the request.';

      return;

    }


    this.clearanceService
      .rejectRequest(

        request.id,

        'Convocation',

        staff.fullName,

        this.comment.trim()

      );


    this.notificationService
      .createNotification(

        request.studentId,

        'Convocation clearance rejected',

        this.comment.trim(),

        'warning'

      );


    this.comment = '';

    this.message =
      'Request rejected and the student has been notified.';

  }


  // =====================================================
  // LOGOUT
  // =====================================================

  logout(): void {

    this.authService.logout();

    this.router.navigate([
      '/login'
    ]);

  }

}