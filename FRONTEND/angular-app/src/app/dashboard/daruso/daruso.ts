import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ClearanceRequest } from '../../core/models/clearance.model';

@Component({
	selector: 'app-daruso',
	standalone: true,
	imports: [CommonModule, FormsModule, RouterLink],
	templateUrl: './daruso.html',
	styleUrl: './daruso.css'
})
export class DarusoComponent {
	private readonly authService = inject(AuthService);
	private readonly clearanceService = inject(ClearanceService);
	private readonly notificationService = inject(NotificationService);
	private readonly router = inject(Router);

	selectedRequest: ClearanceRequest | null = null;
	rejectionComment = '';
	message = '';

	get requests(): ClearanceRequest[] {
		return this.clearanceService.getRequestsForOffice('DARUSO');
	}

    

	approve(request: ClearanceRequest): void {
		const staff = this.authService.getCurrentUser();
		if (!staff) {
			this.router.navigate(['/login']);
			return;
		}

		this.clearanceService.approveRequest(request.id, 'DARUSO', staff.fullName);
		this.notificationService.createNotification(
			request.studentId,
			'DARUSO clearance approved',
			'DARUSO has approved your clearance request.',
			'success'
		);
		this.message = 'Student clearance was approved successfully.';
	}

	openRejectForm(request: ClearanceRequest): void {
		this.selectedRequest = request;
		this.rejectionComment = '';
		this.message = '';
	}

	reject(): void {
		const staff = this.authService.getCurrentUser();
		if (!staff || !this.selectedRequest || !this.rejectionComment.trim()) {
			return;
		}

		this.clearanceService.rejectRequest(
			this.selectedRequest.id,
			'DARUSO',
			staff.fullName,
			this.rejectionComment
		);
		this.notificationService.createNotification(
			this.selectedRequest.studentId,
			'DARUSO action required',
			this.rejectionComment,
			'warning'
		);
		this.message = 'The student has been notified about the required action.';
		this.selectedRequest = null;
		this.rejectionComment = '';
	}

	logout(): void {
		this.authService.logout();
		this.router.navigate(['/login']);
	}
}
