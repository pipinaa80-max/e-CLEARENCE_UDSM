// src/app/clearance/status/status.ts

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { ClearanceRequest } from '../../core/models/clearance.model';

@Component({
  selector: 'app-clearance-status',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './status.html',
  styleUrl: './status.css'
})
export class ClearanceStatusComponent {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  get request(): ClearanceRequest | null {
    const user = this.authService.getCurrentUser();

    if (!user) {
      return null;
    }

    const requests = this.clearanceService.getStudentRequests(user.id);

    return requests.length ? requests[requests.length - 1] : null;
  }

  get currentStageLabel(): string {
    if (!this.request) {
      return 'No clearance request';
    }

    const labels: Record<string, string> = {
      Convocation: 'Convocation payment verification',
      Parallel: 'Parallel office verification',
      Department: 'Department approval',
      Principal: 'Principal approval',
      Finance: 'Finance approval',
      Completed: 'Clearance completed'
    };

    return labels[this.request.currentStage];
  }

  get student() {
    return this.authService.getCurrentUser();
  }

  get processSteps(): Array<{ label: string; detail: string; status: string }> {
    const request = this.request;
    if (!request) return [];
    const officeStatus = (office: string) => request.approvals.find((item) => item.office === office)?.status ?? 'Pending';
    const parallel = ['Games Coach', 'Hall Warden', 'USAB', 'DARUSO', 'Library', 'Dean of Students', 'Smart Card'].map(officeStatus);
    const parallelStatus = parallel.includes('Rejected') ? 'Rejected' : parallel.every((status) => status === 'Approved') ? 'Approved' : 'Pending';
    return [
      { label: 'Convocation', detail: 'Payment and receipt verification', status: officeStatus('Convocation') },
      { label: 'Parallel Offices', detail: 'Games Coach, Hall Warden, USAB, DARUSO, Library, Dean of Students and Smart Card', status: parallelStatus },
      { label: 'Department', detail: 'Department clearance approval', status: officeStatus('Department') },
      { label: 'Principal', detail: 'Principal clearance approval', status: officeStatus('Principal') },
      { label: 'Finance', detail: 'Final financial clearance approval', status: officeStatus('Finance') },
      { label: 'Clearance Approved', detail: 'Your clearance process is complete', status: request.status === 'Completed' ? 'Approved' : 'Pending' }
    ];
  }
}
