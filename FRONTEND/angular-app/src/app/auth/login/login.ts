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
    identifier: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['Student' as UserRole, Validators.required]
  });

  errorMessage = '';

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

    if (this.loginForm.invalid) {
      this.errorMessage = 'Please complete all required fields correctly.';
      this.loginForm.markAllAsTouched();
      return;
    }

    const { identifier, password, role } = this.loginForm.getRawValue();
    const user = this.authService.login(identifier, password, role);

    if (!user) {
      this.errorMessage = 'Invalid login credentials for the selected role.';
      return;
    }

    this.router.navigate([this.redirectPathFor(user.role)]);
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
