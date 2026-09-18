import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ClearanceRequest } from '../../core/models/clearance.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

@Component({
	selector: 'app-daruso',
	standalone: true,
	imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent],
	templateUrl: './daruso.html',
	styleUrl: './daruso.css'
})
export class DarusoComponent {
	private readonly authService = inject(AuthService);
	private readonly clearanceService = inject(ClearanceService);
	private readonly notificationService = inject(NotificationService);
	private readonly router = inject(Router);

	sidebarOpen = false;
	selectedRequest: ClearanceRequest | null = null;
	rejectionComment = '';
	message = '';

	searchTerm = '';
	filterStatus = 'all';

	get currentUser() {
		return this.authService.getCurrentUser();
	}

	toggleSidebar(): void {
		this.sidebarOpen = !this.sidebarOpen;
	}

	get requests(): ClearanceRequest[] {
		return this.clearanceService.getRequestsForOffice('DARUSO');
	}

	get filteredRequests(): ClearanceRequest[] {
		let list = this.requests;

		if (this.searchTerm.trim()) {
			const s = this.searchTerm.toLowerCase();
			list = list.filter(r =>
				this.getStudentName(r).toLowerCase().includes(s) ||
				this.getStudentRegNumber(r).toLowerCase().includes(s) ||
				r.programme.toLowerCase().includes(s)
			);
		}

		// Parallel offices usually only show Pending, but we keep filterStatus for UI consistency
		if (this.filterStatus !== 'all') {
			if (this.filterStatus === 'pending') {
				list = list.filter(r => r.status === 'Pending');
			} else if (this.filterStatus === 'approved') {
				list = list.filter(r => r.status === 'Completed');
			} else if (this.filterStatus === 'rejected') {
				list = list.filter(r => r.status === 'Rejected');
			}
		}

		return list;
	}

	// Cache for student data to avoid repeated lookups
	private studentCache: Map<string, any> = new Map();

	private getStudentData(studentId: string): any | null {
		if (this.studentCache.has(studentId)) {
			return this.studentCache.get(studentId);
		}
		try {
			const usersJson = localStorage.getItem('udsm-local-users');
			if (usersJson) {
				const users = JSON.parse(usersJson);
				const user = users.find((u: any) => u.id === studentId);
				if (user) {
					this.studentCache.set(studentId, user);
					return user;
				}
			}
		} catch (error) {
			console.error('Error fetching student data:', error);
		}
		return null;
	}

	getStudentName(request: ClearanceRequest): string {
		if (request.studentName) return request.studentName;
		const user = this.getStudentData(request.studentId);
		if (user) {
			return user.fullName || user.firstName + ' ' + user.lastName || user.registrationNumber || 'Student';
		}
		return request.registrationNumber || 'Student #' + request.studentId.substring(0, 8);
	}

	getStudentRegNumber(request: ClearanceRequest): string {
		if (request.registrationNumber) return request.registrationNumber;
		const user = this.getStudentData(request.studentId);
		if (user) {
			return user.registrationNumber || user.studentId || 'Not available';
		}
		return 'Not available';
	}

	getStudentPhoto(request: ClearanceRequest): string | null {
		let photo = request.photo;

		// Fallback to local users
		try {
			if (!photo) {
				const usersJson = localStorage.getItem('udsm-local-users');
				if (usersJson) {
					const users = JSON.parse(usersJson);
					const user = users.find((u: any) => u.id === request.studentId);
					if (user) {
						photo = user.photo || user.profilePhoto || user.profileImageUrl;
					}
				}
			}
		} catch (error) {
			console.error('Error fetching student photo:', error);
		}

		if (!photo) return null;

		if (photo.startsWith('data:image') || photo.startsWith('http') || photo.startsWith('/') || photo.startsWith('assets/')) {
			return photo;
		}

		if (photo.length > 50) {
			return 'data:image/jpeg;base64,' + photo;
		}

		return photo;
	}

	getStudentInitials(request: ClearanceRequest): string {
		const name = request.studentName || request.registrationNumber || 'Student';
		const parts = name.split(' ');
		let initials = '';
		for (let i = 0; i < parts.length && i < 2; i++) {
			if (parts[i]) initials += parts[i].charAt(0);
		}
		return initials.toUpperCase();
	}

	hasPhoto(request: ClearanceRequest): boolean {
		const photo = this.getStudentPhoto(request);
		return !!photo;
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
