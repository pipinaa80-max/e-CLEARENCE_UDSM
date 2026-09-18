import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';
import { ToastService } from '../../core/services/toast.service';
import { ProjectAdminService } from '../../core/services/project-admin.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly projectAdminService = inject(ProjectAdminService);

  branding = {
    universityName: 'University of Dar es Salaam',
    shortName: 'Clearance',
    logoUrl: '/public/udsm-logo.png'
  };

  loginForm = this.fb.nonNullable.group({
    identifier: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  errorMessage = '';
  isLoading = false;

  ngOnInit(): void {
    // If the page was previously stuck in a loop, clear local storage once
    // when manually visiting /login to break the cycle.
    if (localStorage.getItem('udsm-recovery-mode')) {
      this.authService.logoutLocal();
      localStorage.removeItem('udsm-recovery-mode');
    }

    const user = this.authService.getCurrentUser();
    if (user) {
      this.router.navigate([this.redirectPathFor(user.role)]);
      return;
    }

    const saved = this.projectAdminService.getSavedBranding();
    if (saved) {
      this.branding = {
        universityName: saved.universityName || this.branding.universityName,
        shortName: saved.shortName || this.branding.shortName,
        logoUrl: saved.logoUrl || this.branding.logoUrl
      };
    }
  }

  submit(): void {
    this.errorMessage = '';
    this.isLoading = true;

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();

      const controls = this.loginForm.controls;
      if (controls.password.errors?.['minlength']) {
        this.errorMessage = 'Password must be at least 6 characters long.';
      } else {
        this.errorMessage = 'Please enter both your identifier and password.';
      }

      this.isLoading = false;
      return;
    }

    const { identifier, password } = this.loginForm.getRawValue();

    // Send login request
    this.authService.login(identifier, password).subscribe({
      next: (user) => {
        this.isLoading = false;
        this.toastService.success('Login Successful', `Welcome back, ${user.fullName}`);
        // Navigate based on mapped role
        this.router.navigate([this.redirectPathFor(user.role)]);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Login failed. Please check your credentials.';
        this.toastService.error('Authentication Failed', this.errorMessage);
      }
    });
  }

  private redirectPathFor(role: UserRole): string {
    const map: Record<UserRole, string> = {
      Student: '/dashboard',
      Convocation: '/convocation/dashboard',
      'Games Coach': '/dashboard/games-coach',
      'Hall Warden': '/dashboard/hall-warden',
      USAB: '/dashboard/usab',
      DARUSO: '/dashboard/daruso',
      Library: '/dashboard/library',
      'Dean of Students': '/dashboard/dean-of-students',
      'Smart Card': '/dashboard/smart-card',
      Department: '/department/dashboard',
      Finance: '/dashboard/finance',
      ICT: '/dashboard/ict',
      'Academic Staff': '/dashboard/academic',
      Administrator: '/dashboard/admin',
      Principal: '/dashboard/principal',
      Workshop: '/dashboard/workshop',
      Laboratory: '/dashboard/laboratory'
    };
    return map[role] ?? '/dashboard';
  }
}
