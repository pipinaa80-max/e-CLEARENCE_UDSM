// src/app/auth/register/register.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  registerForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    middleName: [''],
    lastName: ['', Validators.required],
    registrationNumber: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
    acceptTerms: [false, Validators.requiredTrue]
  });

  errorMessage = '';
  successMessage = '';
  isLoading = false;

  submit(): void {
    // Reset messages
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    console.log('🔵 Submit button clicked');
    console.log('🔵 Form valid?', this.registerForm.valid);

    // Check if form is valid
    if (this.registerForm.invalid) {
      console.log('❌ Form is invalid');
      this.registerForm.markAllAsTouched();

      const controls = this.registerForm.controls;
      if (controls.email.errors?.['email']) {
        this.errorMessage = 'Please enter a valid email address.';
      } else if (controls.password.errors?.['minlength']) {
        this.errorMessage = 'Password must be at least 8 characters long.';
      } else if (controls.acceptTerms.errors?.['required']) {
        this.errorMessage = 'You must accept the terms of service to register.';
      } else {
        this.errorMessage = 'Please fill in all required fields marked with *.';
      }
      this.isLoading = false;
      return;
    }

    const value = this.registerForm.getRawValue();
    console.log('📝 Form values:', value);

    // Check passwords match
    if (value.password !== value.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      this.isLoading = false;
      return;
    }

    // ========== FIX: Send fields that backend expects ==========
    // Backend expects: firstName, lastName, phone (NOT fullName, phoneNumber)
    const userData = {
      firstName: value.firstName,           // ✅ Individual field
      middleName: value.middleName || '',   // ✅ Individual field
      lastName: value.lastName,             // ✅ Individual field
      registrationNumber: value.registrationNumber,
      email: value.email,
      phone: value.phone,                   // ✅ 'phone' not 'phoneNumber'
      password: value.password,
      role: 'STUDENT'
    };
    // ===========================================================

    console.log('📤 Sending to backend:', JSON.stringify(userData, null, 2));

    this.authService.register(userData).subscribe({
      next: (response) => {
        console.log('✅ Registration Success:', response);
        this.isLoading = false;
        this.successMessage = response.message || 'Registration successful! Redirecting to login...';

        // Auto-login after registration
        this.authService.login(value.email, value.password).subscribe({
          next: (user) => {
            console.log('✅ Auto-login Success');
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
            }, 1500);
          },
          error: (err) => {
            console.error('❌ Auto-login Error:', err);
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 2000);
          }
        });
      },
      error: (err) => {
        console.error('❌ Registration Error:', err);
        this.isLoading = false;

        if (err.status === 0) {
          this.errorMessage = 'Cannot connect to server. Please check if backend is running on port 8080.';
        } else if (err.status === 409) {
          this.errorMessage = 'User with this email or registration number already exists.';
        } else if (err.status === 400) {
          this.errorMessage = 'Invalid registration data. Please check your inputs.';
          console.log('Validation errors:', err.error);
        } else {
          this.errorMessage = err.error?.message || 'Unable to register user. Please try again.';
        }
      }
    });
  }
}