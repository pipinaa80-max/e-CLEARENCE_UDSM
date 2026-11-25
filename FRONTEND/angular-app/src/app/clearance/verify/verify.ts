// src/app/clearance/verify/verify.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CertificateService, CertificateVerificationResponse } from '../../core/services/certificate.service';

@Component({
  selector: 'app-certificate-verify',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './verify.html',
  styleUrl: './verify.css'
})
export class CertificateVerifyComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly certificateService = inject(CertificateService);

  verificationCode: string = '';
  isLoading: boolean = true;
  result: CertificateVerificationResponse | null = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const code = params.get('code');
      if (code) {
        this.verificationCode = code.trim();
        this.verify(this.verificationCode);
      } else {
        this.isLoading = false;
        this.result = {
          valid: false,
          error: 'No verification code was provided.'
        };
      }
    });
  }

  verify(code: string): void {
    this.isLoading = true;
    this.certificateService.verifyCertificate(code).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.result = res;
      },
      error: (err) => {
        this.isLoading = false;
        this.result = {
          valid: false,
          error: err.error?.message || err.message || 'Unable to connect to verification server.'
        };
      }
    });
  }
}
