import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({ selector: 'app-register', standalone: true, imports: [CommonModule, ReactiveFormsModule, RouterLink], templateUrl: './register.html', styleUrl: './register.css' })
export class Register {
  private readonly fb = inject(FormBuilder); private readonly authService = inject(AuthService); private readonly router = inject(Router);
  registerForm = this.fb.nonNullable.group({ firstName: ['', Validators.required], middleName: [''], lastName: ['', Validators.required], registrationNumber: ['', Validators.required], email: ['', [Validators.required, Validators.email]], phone: ['', Validators.required], password: ['', [Validators.required, Validators.minLength(8)]], confirmPassword: ['', Validators.required], acceptTerms: [false, Validators.requiredTrue] });
  errorMessage = ''; successMessage = '';
  submit(): void {
    this.errorMessage = ''; this.successMessage = '';
    if (this.registerForm.invalid) { this.errorMessage = 'Please complete all required fields correctly.'; this.registerForm.markAllAsTouched(); return; }
    const value = this.registerForm.getRawValue(); if (value.password !== value.confirmPassword) { this.errorMessage = 'Passwords do not match.'; return; }
    try { this.authService.register({ fullName:[value.firstName,value.middleName,value.lastName].filter(Boolean).join(' '), registrationNumber:value.registrationNumber, email:value.email, phone:value.phone, password:value.password, role:'Student', programme:'Not selected', department:'Not selected', college:'Not selected', yearOfStudy:1, status:'Active' }); this.successMessage = 'Registration successful. Redirecting to login...'; setTimeout(() => this.router.navigate(['/login']), 800); }
    catch (error) { this.errorMessage = error instanceof Error ? error.message : 'Unable to register user.'; }
  }
}
