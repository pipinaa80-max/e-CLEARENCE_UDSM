import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
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
  private readonly changeDetector = inject(ChangeDetectorRef);

  branding = {
    universityName: 'University of Dar es Salaam',
    shortName: 'University of Dar es Salaam',
    logoUrl: '/udsm-logo.png'
  };

  loginForm = this.fb.nonNullable.group({
    identifier: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    honeypotTrap: ['']
  });

  isLoading = false;
  showPassword = false;

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
      const validLogo = (saved.logoUrl && saved.logoUrl.trim() !== '' && saved.logoUrl.toLowerCase() !== 'none') ? saved.logoUrl : '/udsm-logo.png';
      this.branding = {
        universityName: (!saved.universityName || saved.universityName.toLowerCase() === 'udsm') ? 'University of Dar es Salaam' : saved.universityName,
        shortName: (!saved.shortName || saved.shortName.toLowerCase() === 'udsm') ? 'University of Dar es Salaam' : saved.shortName,
        logoUrl: validLogo
      };
    }
  }

  onLogoError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = '/udsm-logo.png';
    }
  }

  get isIdentifierFilled(): boolean {
    const val = this.loginForm.controls.identifier.value;
    return typeof val === 'string' && val.trim().length > 0;
  }

  get isPasswordFilled(): boolean {
    const val = this.loginForm.controls.password.value;
    return typeof val === 'string' && val.length > 0;
  }

  get isFormReady(): boolean {
    return this.loginForm.valid;
  }

  onIdentifierEnter(event: Event): void {
    event.preventDefault();
    const passwordInput = document.getElementById('password') as HTMLInputElement | null;
    if (passwordInput) {
      passwordInput.focus();
    }
  }

  onPasswordEnter(event: Event): void {
    event.preventDefault();
    if (!this.isLoading) {
      this.submit();
    }
  }

  submit(): void {
    if (this.isLoading) return;

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();

      const controls = this.loginForm.controls;
      if (!controls.identifier.value.trim()) {
        this.toastService.warning('Missing Information', 'Please enter your email or registration number.');
        const idInput = document.getElementById('identifier') as HTMLInputElement | null;
        idInput?.focus();
      } else if (!controls.password.value) {
        this.toastService.warning('Missing Information', 'Please enter your password.');
        const passInput = document.getElementById('password') as HTMLInputElement | null;
        passInput?.focus();
      } else if (controls.password.errors?.['minlength']) {
        this.toastService.warning('Invalid Input', 'Password must be at least 6 characters long.');
        const passInput = document.getElementById('password') as HTMLInputElement | null;
        passInput?.focus();
      } else {
        this.toastService.warning('Missing Information', 'Please complete the login form.');
      }
      return;
    }

    this.isLoading = true;

    const { identifier, password } = this.loginForm.getRawValue();

    // Send login request
    this.authService.login(identifier, password).subscribe({
      next: (user) => {
        this.isLoading = false;
        this.toastService.success('Login Successful', 'Welcome back');
        this.changeDetector.detectChanges();
        this.router.navigate([this.redirectPathFor(user.role)]);
      },
      error: (err) => {
        this.isLoading = false;
        // Authentication and connection failures are shown by the fallback request's
        // interceptor; unexpected failures still need a message after the first request.
        if (![0, 401, 403].includes(err.status)) {
          this.toastService.error('Sign-in Failed', 'We could not complete your sign-in request. Please try again.');
        }
        this.changeDetector.detectChanges();
        console.error('Login request failed:', err);
      }
    });
  }

  private redirectPathFor(role: UserRole): string {
    const map: Record<UserRole, string> = {
      Student: '/dashboard',
      Convocation: '/dashboard/convocation',
      'Games Coach': '/dashboard/games-coach',
      'Hall Warden': '/dashboard/hall-warden',
      USAB: '/dashboard/usab',
      DARUSO: '/dashboard/daruso',
      Library: '/dashboard/library',
      'Dean of Students': '/dashboard/dean-of-students',
      'Smart Card': '/dashboard/smart-card',
      Department: '/department/dashboard',
      Finance: '/dashboard/finance',
      'Academic Staff': '/dashboard/academic',
      Lecturer: '/dashboard/lecturer',
      Administrator: '/dashboard/admin',
      Principal: '/dashboard/principal',
      Workshop: '/dashboard/workshop',
      Laboratory: '/dashboard/laboratory',
      'Director of Undergraduate Studies': '/dashboard/director-undergraduate-studies',
      'Director of Postgraduate Studies': '/dashboard/director-postgraduate-studies',
      'DUS Examination Office': '/dashboard/dus-secretary',
      'DUS Secretary': '/dashboard/dus-secretary',
      'Station Secretary': '/dashboard/station-secretary',
      Supervisor: '/dashboard/supervisor'
    };
    return map[role] ?? '/dashboard';
  }
}
