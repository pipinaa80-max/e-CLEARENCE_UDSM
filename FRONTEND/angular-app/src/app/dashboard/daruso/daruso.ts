import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ApprovalStatus, ClearanceRequest } from '../../core/models/clearance.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

interface StudentProfile {
	id?: string;
	firstName?: string;
	middleName?: string;
	lastName?: string;
	fullName?: string;
	registrationNumber?: string;
	studentId?: string;
	email?: string;
	phone?: string;
	phoneNumber?: string;
	programme?: string;
}

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
	readonly processingRequests = new Set<string>();

	searchTerm = '';
	filterStatus: ApprovalStatus = 'Pending';
	currentPage = 1;
	pageSize = 20;

	get paginatedRequests(): ClearanceRequest[] {
		const start = (this.currentPage - 1) * this.pageSize;
		return this.filteredRequests.slice(start, start + this.pageSize);
	}

	get totalPages(): number {
		return Math.ceil(this.filteredRequests.length / this.pageSize) || 1;
	}

	nextPage(): void {
		if (this.currentPage < this.totalPages) {
			this.currentPage++;
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	prevPage(): void {
		if (this.currentPage > 1) {
			this.currentPage--;
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	onFilterChange(): void {
		this.currentPage = 1;
	}

	get currentUser() {
		return this.authService.getCurrentUser();
	}

	toggleSidebar(): void {
		this.sidebarOpen = !this.sidebarOpen;
	}

	getRequestOfficeStatus(request: ClearanceRequest, office: string): string {
		return request.approvals.find(a => a.office === office)?.status ?? 'Pending';
	}

	get requests(): ClearanceRequest[] {
		return this.clearanceService.getRequestsForOffice('DARUSO');
	}

	get pendingRequestCount(): number {
		return this.requests.filter(request => this.getRequestOfficeStatus(request, 'DARUSO') === 'Pending').length;
	}

	get filteredRequests(): ClearanceRequest[] {
		let list = this.requests;

		if (this.searchTerm.trim()) {
			const s = this.searchTerm.trim().toLowerCase();
			list = list.filter(r =>
				this.getStudentName(r).toLowerCase().includes(s) ||
				this.getStudentRegNumber(r).toLowerCase().includes(s) ||
				this.getStudentProgramme(r).toLowerCase().includes(s)
			);
		}

		return list.filter(request => this.getRequestOfficeStatus(request, 'DARUSO') === this.filterStatus);
	}

	private readonly studentCache = new Map<string, StudentProfile | null>();

	private getStudentData(studentId: string): StudentProfile | null {
		if (this.studentCache.has(studentId)) {
			return this.studentCache.get(studentId) ?? null;
		}
		try {
			const usersJson = localStorage.getItem('udsm-local-users');
			if (usersJson) {
				const users: unknown = JSON.parse(usersJson);
				const user = Array.isArray(users)
					? users.find((item): item is StudentProfile =>
						typeof item === 'object' && item !== null &&
						'id' in item && item.id === studentId)
					: undefined;
				if (user) {
					this.studentCache.set(studentId, user);
					return user;
				}
			}
		} catch (error) {
			console.error('Error fetching student data:', error);
		}
		this.studentCache.set(studentId, null);
		return null;
	}

	getStudentName(request: ClearanceRequest): string {
		const user = this.getStudentData(request.studentId);
		const firstName = user?.firstName?.trim();
		const middleName = user?.middleName?.trim();
		const lastName = user?.lastName?.trim();
		if (firstName && lastName) {
			return `${lastName}, ${[firstName, middleName].filter(Boolean).join(' ')}`.toUpperCase();
		}

		const fullName = request.studentName?.trim() || user?.fullName?.trim();
		if (!fullName) return '—';
		const nameParts = fullName.split(/\s+/).filter(Boolean);
		if (nameParts.length > 1) {
			const surname = nameParts.pop();
			return `${surname}, ${nameParts.join(' ')}`.toUpperCase();
		}
		return fullName.toUpperCase();
	}

	getStudentRegNumber(request: ClearanceRequest): string {
		const user = this.getStudentData(request.studentId);
		return request.registrationNumber?.trim() ||
			user?.registrationNumber?.trim() ||
			user?.studentId?.trim() ||
			'—';
	}

	getStudentEmail(request: ClearanceRequest): string {
		return request.email?.trim() || this.getStudentData(request.studentId)?.email?.trim() || '—';
	}

	getStudentPhone(request: ClearanceRequest): string {
		const user = this.getStudentData(request.studentId);
		return request.phoneNumber?.trim() || user?.phoneNumber?.trim() || user?.phone?.trim() || '—';
	}

	getStudentProgramme(request: ClearanceRequest): string {
		return request.programme?.trim() || this.getStudentData(request.studentId)?.programme?.trim() || '—';
	}

	approve(request: ClearanceRequest): void {
		if (this.processingRequests.has(request.id)) return;
		const staff = this.authService.getCurrentUser();
		if (!staff) {
			this.router.navigate(['/login']);
			return;
		}

		this.processingRequests.add(request.id);
		try {
			const approved = this.clearanceService.approveRequest(request.id, 'DARUSO', staff.fullName);
			if (!approved) {
				this.message = 'This request could not be approved. It may have already been reviewed.';
				return;
			}
			this.notificationService.createNotification(
				request.studentId,
				'DARUSO clearance approved',
				'DARUSO has approved your clearance request.',
				'success'
			);
			this.message = 'Student clearance was approved successfully.';
			this.keepCurrentPageInRange();
		} finally {
			this.processingRequests.delete(request.id);
		}
	}

	openRejectForm(request: ClearanceRequest): void {
		this.selectedRequest = request;
		this.rejectionComment = '';
		this.message = '';
	}

	reject(): void {
		const request = this.selectedRequest;
		if (!request || this.processingRequests.has(request.id) || !this.rejectionComment.trim()) {
			return;
		}
		const staff = this.authService.getCurrentUser();
		if (!staff) {
			this.router.navigate(['/login']);
			return;
		}

		this.processingRequests.add(request.id);
		try {
			const rejected = this.clearanceService.rejectRequest(
				request.id,
				'DARUSO',
				staff.fullName,
				this.rejectionComment
			);
			if (!rejected) {
				this.message = 'This request could not be rejected. It may have already been reviewed.';
				return;
			}
			this.notificationService.createNotification(
				request.studentId,
				'DARUSO action required',
				this.rejectionComment,
				'warning'
			);
			this.message = 'The student has been notified about the required action.';
			this.selectedRequest = null;
			this.rejectionComment = '';
			this.keepCurrentPageInRange();
		} finally {
			this.processingRequests.delete(request.id);
		}
	}

	private keepCurrentPageInRange(): void {
		this.currentPage = Math.min(this.currentPage, this.totalPages);
	}

	logout(): void {
		this.authService.logout();
		this.router.navigate(['/login']);
	}
}
