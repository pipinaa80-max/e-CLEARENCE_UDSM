import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';

@Component({ selector: 'app-clearance-confirmation', standalone: true, imports: [CommonModule, RouterLink], templateUrl: './confirmation.html', styleUrl: './confirmation.css' })
export class ClearanceConfirmationComponent {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  get request() { const user = this.authService.getCurrentUser(); return user ? this.clearanceService.getStudentRequests(user.id).at(-1) ?? null : null; }
  get registrationNumber(): string { return this.authService.getCurrentUser()?.registrationNumber ?? ''; }
}
