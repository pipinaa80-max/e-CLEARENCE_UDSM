import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  loginForm = this.fb.nonNullable.group({
    identifier: ['', Validators.required], // ← Changed from 'email' to 'identifier'
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['Student' as UserRole, Validators.required] // Kept for navigation
  });

  errorMessage = '';
  isLoading = false;

  readonly roles: UserRole[] = [
    'Student',
    'Library',
    'Department',
    'Finance',
    'ICT',
    'Academic Staff',
    'Administrator'
  ];

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

    const { identifier, password, role } = this.loginForm.getRawValue();

    // Send login request WITHOUT the role
    this.authService.login(identifier, password).subscribe({
      next: (user) => {
        this.isLoading = false;
        // Navigate based on mapped role
        this.router.navigate([this.redirectPathFor(user.role)]);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Login failed. Please check your credentials.';
      }
    });
  }

  private redirectPathFor(role: UserRole): string {
    const map: Record<UserRole, string> = {
      Student: '/dashboard',
      Library: '/dashboard/library',
      Department: '/dashboard/department',
      Finance: '/dashboard/finance',
      ICT: '/dashboard/ict',
      'Academic Staff': '/dashboard/academic',
      Administrator: '/dashboard/admin'
    };
    return map[role] ?? '/dashboard';
  }
}