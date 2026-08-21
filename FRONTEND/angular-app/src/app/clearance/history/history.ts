import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';

@Component({ selector: 'app-clearance-history', standalone: true, imports: [CommonModule, FormsModule, RouterLink], templateUrl: './history.html', styleUrl: './history.css' })
export class ClearanceHistoryComponent {
  private readonly authService = inject(AuthService); private readonly clearanceService = inject(ClearanceService); filter = 'All';
  get requests() { const user = this.authService.getCurrentUser(); const requests = user ? this.clearanceService.getClearanceHistory(user.id) : []; return this.filter === 'All' ? requests : requests.filter((request) => request.status === this.filter); }
  get total() { const user = this.authService.getCurrentUser(); return user ? this.clearanceService.getClearanceHistory(user.id).length : 0; }
}
