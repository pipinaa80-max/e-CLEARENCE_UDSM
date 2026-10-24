import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css'
})
export class VerifyEmail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  message = 'Verifying your email...';
  error = false;
  isLoading = true;

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.fail('This verification link is missing its token.');
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.message = response.message || 'Your email has been verified and your account is now active.';
      },
      error: (error) => {
        console.error('Email verification failed:', error);
        this.fail('This verification link is invalid or expired. Request a new link and try again.');
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  private fail(message: string): void {
    this.isLoading = false;
    this.error = true;
    this.message = message;
  }
}
