import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ClearanceService } from '../core/services/clearance.service';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-clearance-departments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './departments.html',
  styleUrls: ['./departments.css']
})
export class ClearanceDepartmentsComponent {
  private readonly clearanceService = inject(ClearanceService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  user = this.authService.getCurrentUser();

  get latestRequest() {
    if (!this.user) return null;
    const reqs = this.clearanceService.getStudentRequests(this.user.id);
    return reqs.length ? reqs[reqs.length - 1] : null;
  }

  get approvals() {
    const req = this.latestRequest;
    if (!req) return [];
    return this.clearanceService.getApprovalsForRequest(req.id).sort((a, b) => {
      const ga = a.group === 'parallel' ? 0 : 1;
      const gb = b.group === 'parallel' ? 0 : 1;
      if (ga !== gb) return ga - gb;
      return (a.sequenceIndex ?? 0) - (b.sequenceIndex ?? 0);
    });
  }

  viewRequest(): void {
    this.router.navigate(['/clearance/status']);
  }

  createRequest(): void {
    this.router.navigate(['/clearance/request']);
  }
}
