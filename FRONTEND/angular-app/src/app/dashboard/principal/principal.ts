// principal.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { ClearanceRequest } from '../../core/models/clearance.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

@Component({
    selector: 'app-principal',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent],
    templateUrl: './principal.html',
    styleUrl: './principal.css'
})
export class PrincipalComponent implements OnInit {
    private readonly authService = inject(AuthService);
    private readonly clearanceService = inject(ClearanceService);
    private readonly notificationService = inject(NotificationService);
    private readonly toastService = inject(ToastService);
    private readonly router = inject(Router);

    sidebarOpen = false;
    isLoading = false;
    message = '';
    searchTerm = '';
    filterStatus = 'pending';
    currentPage = 1;
    pageSize = 10;

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
        this.applyFilters();
    }

    pendingRequests: ClearanceRequest[] = [];
    filteredRequests: ClearanceRequest[] = [];
    detailsRequest: ClearanceRequest | null = null;
    selectedRequest: ClearanceRequest | null = null;
    rejectionComment = '';

    viewMode: 'requests' | 'analytics' = 'requests';
    selectedAnalyticsYear = 'all';
    selectedAnalyticsGender = 'all';
    hoveredDeptName: string | null = null;

    private studentCache: Map<string, any> = new Map();


    get currentUser() {
        return this.authService.getCurrentUser();
    }

    get collegeName(): string {
        return this.currentUser?.college || 'College';
    }

    get pendingRequestCount(): number {
        return this.pendingRequests.filter(request =>
            this.getRequestOfficeStatus(request, 'Principal') === 'Pending'
        ).length;
    }

    ngOnInit(): void {
        this.loadData();
    }

    loadData(): void {
        this.isLoading = true;
        this.studentCache.clear();

        const user = this.currentUser;
        if (!user) {
            this.router.navigate(['/login']);
            this.isLoading = false;
            return;
        }

        const allRequests = this.clearanceService.getAllRequests();

        // Principal reviews requests for their college
        this.pendingRequests = allRequests.filter(request => {
            const studentCollege = this.getStudentCollege(request);
            const isCollegeMatch = !user.college || this.matchCollege(studentCollege, user.college);

            if (!isCollegeMatch) return false;

            const deptStatus = this.getRequestOfficeStatus(request, 'Department');

            // Principal sees requests that are at Principal stage or further along, or where Department is approved
            return request.currentStage === 'Principal' ||
                request.currentStage === 'Finance' ||
                request.status === 'Completed' ||
                deptStatus === 'Approved';
        });

        this.applyFilters();

        this.isLoading = false;
        console.log('Principal requests loaded:', this.pendingRequests.length);
    }

    getRequestOfficeStatus(request: ClearanceRequest, office: string): string {
        return request.approvals.find(a => a.office === office)?.status ?? 'Pending';
    }

    applyFilters(): void {
        let filtered = [...this.pendingRequests];

        if (this.filterStatus === 'pending') {
            filtered = filtered.filter(r => this.getRequestOfficeStatus(r, 'Principal') === 'Pending');
        } else if (this.filterStatus === 'approved') {
            filtered = filtered.filter(r => this.getRequestOfficeStatus(r, 'Principal') === 'Approved');
        } else if (this.filterStatus === 'rejected') {
            filtered = filtered.filter(r => this.getRequestOfficeStatus(r, 'Principal') === 'Rejected');
        }

        if (this.searchTerm.trim()) {
            const term = this.searchTerm.trim().toLowerCase();
            filtered = filtered.filter(r => {
                const name = this.getStudentName(r).toLowerCase();
                const reg = this.getStudentRegNumber(r).toLowerCase();
                const prog = (r.programme || '').toLowerCase();
                return name.includes(term) || reg.includes(term) || prog.includes(term);
            });
        }

        this.filteredRequests = filtered;
    }

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

    getStudentListName(request: ClearanceRequest): string {
        const user = this.getStudentData(request.studentId);
        const firstName = user?.firstName?.trim();
        const middleName = user?.middleName?.trim();
        const lastName = user?.lastName?.trim();
        if (firstName && lastName) return `${lastName}, ${[firstName, middleName].filter(Boolean).join(' ')}`.toUpperCase();
        const fullName = (request.studentName || user?.fullName || '').trim();
        if (!fullName) return '—';
        const parts = fullName.split(/\s+/).filter(Boolean);
        return parts.length > 1 ? `${parts.pop()}, ${parts.join(' ')}`.toUpperCase() : fullName.toUpperCase();
    }

    getStudentRegNumber(request: ClearanceRequest): string {
        if (request.registrationNumber) return request.registrationNumber;
        const user = this.getStudentData(request.studentId);
        if (user) {
            return user.registrationNumber || user.studentId || 'Not available';
        }
        return 'Not available';
    }

    getStudentGender(request: ClearanceRequest): string {
        const gender = this.getStudentData(request.studentId)?.gender || (request as ClearanceRequest & { gender?: string }).gender;
        return typeof gender === 'string' && gender.trim() ? gender.trim() : '—';
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

    getStudentCollege(request: ClearanceRequest): string {
        if (request.college && request.college.trim()) return request.college.trim();
        const user = this.getStudentData(request.studentId);
        return user?.college?.trim() || user?.faculty?.trim() || '';
    }

    matchCollege(studentCollege: string, userCollege: string): boolean {
        if (!userCollege || !userCollege.trim()) return true;
        if (!studentCollege || !studentCollege.trim()) return true;

        const c1 = studentCollege.trim().toLowerCase();
        const c2 = userCollege.trim().toLowerCase();

        if (c1 === c2 || c1.includes(c2) || c2.includes(c1)) return true;

        const getAcronym = (s: string) => {
            const match = s.match(/\(([^)]+)\)/);
            return match ? match[1].trim().toLowerCase() : '';
        };

        const a1 = getAcronym(c1);
        const a2 = getAcronym(c2);

        if (a1 && (a1 === c2 || c2.includes(a1))) return true;
        if (a2 && (a2 === c1 || c1.includes(a2))) return true;
        if (a1 && a2 && a1 === a2) return true;

        return false;
    }

    openDetails(request: ClearanceRequest): void {
        this.detailsRequest = request;
    }

    getStudentPhoto(request: ClearanceRequest): string | null {
        let photo = request.photo;
        if (!photo) {
            const user = this.getStudentData(request.studentId);
            if (user) {
                photo = user.photo || user.profilePhoto || user.profileImageUrl;
            }
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
        const name = this.getStudentName(request);
        if (!name || name === 'Student') return 'ST';
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

    enlargedPhotoUrl: string | null = null;

    openEnlargedPhoto(photoUrl: string | null): void {
        if (photoUrl) {
            this.enlargedPhotoUrl = photoUrl;
        }
    }

    closeEnlargedPhoto(): void {
        this.enlargedPhotoUrl = null;
    }

    getDocumentStatus(request: ClearanceRequest): { total: number; uploaded: number; verified: number } {
        const hasPhoto = this.hasPhoto(request);
        return {
            total: 4,
            uploaded: hasPhoto ? 4 : 3,
            verified: hasPhoto ? 3 : 2
        };
    }

    getOfficeStatus(request: ClearanceRequest, office: string): string {
        const approval = request.approvals.find(a => a.office === office);
        return approval?.status || 'Pending';
    }

    approve(request: ClearanceRequest): void {
        const staff = this.currentUser;
        if (!staff) return;

        const studentName = this.getStudentName(request);
        const confirmApprove = confirm(
            `⚠️ Attention: Approve Clearance\n\nAre you sure you want to APPROVE Principal clearance for ${studentName}?`
        );
        if (!confirmApprove) return;

        if (!this.clearanceService.approveRequest(request.id, 'Principal', staff.fullName)) {
            this.toastService.error('Error', 'Failed to approve request. Please try again.');
            return;
        }

        this.loadData();
        this.notificationService.createNotification(
            request.studentId,
            'Principal clearance approved',
            'The Principal has approved your clearance request.',
            'success'
        );
        this.toastService.success('Approved', `Principal clearance approved for ${studentName}.`);
        this.message = `Student ${this.getStudentName(request)} was approved successfully.`;
    }

    openRejectForm(request: ClearanceRequest): void {
        this.selectedRequest = request;
        this.rejectionComment = '';
        this.message = '';
    }

    reject(): void {
        const staff = this.currentUser;
        if (!staff || !this.selectedRequest) return;

        if (!this.rejectionComment.trim()) {
            this.toastService.warning('Comment Required', 'Please provide a reason for rejection.');
            return;
        }

        const studentName = this.getStudentName(this.selectedRequest);
        const regNumber = this.getStudentRegNumber(this.selectedRequest);

        const confirmReject = confirm(
            `⚠️ Attention: Reject Clearance\n\nAre you sure you want to REJECT Principal clearance for ${studentName} (${regNumber})?\n\nReason: "${this.rejectionComment.trim()}"\n\nThis will send the reason to the student for correction or college clearance requirements.`
        );
        if (!confirmReject) return;

        const rejected = this.clearanceService.rejectRequest(
            this.selectedRequest.id,
            'Principal',
            staff.fullName || staff.firstName + ' ' + staff.lastName,
            this.rejectionComment.trim()
        );

        if (!rejected) {
            this.toastService.error('Reject Failed', 'Failed to reject clearance request.');
            return;
        }

        this.notificationService.createNotification(
            this.selectedRequest.studentId,
            'Principal Clearance Action Required',
            this.rejectionComment.trim(),
            'warning'
        );

        this.toastService.warning('Returned', `Principal clearance request returned for ${studentName}.`);
        this.message = `Student ${studentName} has been notified regarding: "${this.rejectionComment.trim()}".`;

        this.selectedRequest = null;
        this.rejectionComment = '';
        this.loadData();
    }

    // =========================================================================
    // COLLEGE STATISTICAL ANALYTICS ENGINE
    // =========================================================================

    get collegeRequests(): ClearanceRequest[] {
        const user = this.currentUser;
        const allRequests = this.clearanceService.getAllRequests();
        return allRequests.filter(r => {
            const studentCollege = this.getStudentCollege(r);
            return !user?.college || this.matchCollege(studentCollege, user.college);
        });
    }

    get totalCollegeStudents(): number {
        return this.collegeRequests.length;
    }

    get clearedCollegeCount(): number {
        return this.collegeRequests.filter(r =>
            this.getRequestOfficeStatus(r, 'Principal') === 'Approved' || r.status === 'Completed'
        ).length;
    }

    get pendingCollegeCount(): number {
        return this.collegeRequests.filter(r =>
            this.getRequestOfficeStatus(r, 'Principal') === 'Pending' && r.status !== 'Completed'
        ).length;
    }

    get rejectedCollegeCount(): number {
        return this.collegeRequests.filter(r =>
            this.getRequestOfficeStatus(r, 'Principal') === 'Rejected' || r.status === 'Rejected'
        ).length;
    }

    get collegeClearanceRate(): number {
        return Math.round((this.clearedCollegeCount / (this.totalCollegeStudents || 1)) * 100) || 0;
    }

    get departmentBreakdown(): { name: string; total: number; cleared: number; pending: number; rejected: number; clearanceRate: number }[] {
        const groups = new Map<string, { total: number; cleared: number; pending: number; rejected: number }>();

        for (const req of this.collegeRequests) {
            const dept = (req.department || 'General Department').trim();
            const current = groups.get(dept) || { total: 0, cleared: 0, pending: 0, rejected: 0 };
            current.total++;

            const status = this.getRequestOfficeStatus(req, 'Principal');
            if (status === 'Approved' || req.status === 'Completed') {
                current.cleared++;
            } else if (status === 'Rejected' || req.status === 'Rejected') {
                current.rejected++;
            } else {
                current.pending++;
            }
            groups.set(dept, current);
        }

        return Array.from(groups.entries()).map(([name, stats]) => ({
            name,
            total: stats.total,
            cleared: stats.cleared,
            pending: stats.pending,
            rejected: stats.rejected,
            clearanceRate: Math.round((stats.cleared / (stats.total || 1)) * 100) || 0
        })).sort((a, b) => b.total - a.total);
    }

    get yearResidencyHistogram(): { yearLabel: string; total: number; cleared: number; clearanceRate: number }[] {
        const cohorts = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Postgraduate'];
        return cohorts.map(cohort => {
            const matchRequests = this.collegeRequests.filter(r => {
                const prog = (r.programme || '').toLowerCase();
                const reg = (this.getStudentRegNumber(r) || '').toLowerCase();
                if (cohort === 'Postgraduate') return prog.includes('master') || prog.includes('phd') || prog.includes('postgraduate');
                if (cohort === 'Year 1') return reg.includes('2024') || reg.includes('2023');
                if (cohort === 'Year 2') return reg.includes('2022');
                if (cohort === 'Year 3') return reg.includes('2021');
                if (cohort === 'Year 4') return reg.includes('2020') || reg.includes('2019');
                return true;
            });
            const total = matchRequests.length;
            const cleared = matchRequests.filter(r => this.getRequestOfficeStatus(r, 'Principal') === 'Approved' || r.status === 'Completed').length;
            const clearanceRate = Math.round((cleared / (total || 1)) * 100) || 0;
            return { yearLabel: cohort, total, cleared, clearanceRate };
        });
    }

    get genderStats(): { maleTotal: number; maleCleared: number; malePercent: number; femaleTotal: number; femaleCleared: number; femalePercent: number } {
        let maleTotal = 0, maleCleared = 0, femaleTotal = 0, femaleCleared = 0;

        for (const req of this.collegeRequests) {
            const gender = this.getStudentGender(req).toLowerCase();
            const isCleared = this.getRequestOfficeStatus(req, 'Principal') === 'Approved' || req.status === 'Completed';

            if (gender.startsWith('f')) {
                femaleTotal++;
                if (isCleared) femaleCleared++;
            } else {
                maleTotal++;
                if (isCleared) maleCleared++;
            }
        }

        return {
            maleTotal,
            maleCleared,
            malePercent: Math.round((maleCleared / (maleTotal || 1)) * 100) || 0,
            femaleTotal,
            femaleCleared,
            femalePercent: Math.round((femaleCleared / (femaleTotal || 1)) * 100) || 0
        };
    }

    downloadAnalyticsCsv(): void {
        const rows = [
            ['UDSM COLLEGE PRINCIPAL CLEARANCE ANALYTICS REPORT'],
            ['College / School:', this.collegeName],
            ['Report Date:', new Date().toLocaleString()],
            [''],
            ['1. EXECUTIVE SUMMARY METRICS'],
            ['Metric', 'Value'],
            ['Total Applications Received', String(this.totalCollegeStudents)],
            ['Cleared / Approved Applications', String(this.clearedCollegeCount)],
            ['Pending Applications', String(this.pendingCollegeCount)],
            ['Rejected / Returned Applications', String(this.rejectedCollegeCount)],
            ['Overall College Clearance Rate (%)', `${this.collegeClearanceRate}%`],
            [''],
            ['2. DEPARTMENTAL CLEARANCE BREAKDOWN'],
            ['Department Name', 'Total Applications', 'Cleared', 'Pending', 'Rejected', 'Clearance Rate (%)'],
            ...this.departmentBreakdown.map(d => [
                d.name, String(d.total), String(d.cleared), String(d.pending), String(d.rejected), `${d.clearanceRate}%`
            ]),
            [''],
            ['3. ACADEMIC COHORT BREAKDOWN'],
            ['Cohort', 'Total Applications', 'Cleared', 'Clearance Rate (%)'],
            ...this.yearResidencyHistogram.map(y => [
                y.yearLabel, String(y.total), String(y.cleared), `${y.clearanceRate}%`
            ])
        ];

        const csvContent = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `principal-${this.collegeName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        this.toastService.success('Export Successful', 'College analytics report exported as CSV.');
    }

    toggleSidebar(): void {
        this.sidebarOpen = !this.sidebarOpen;
    }

    closeSidebar(): void {
        this.sidebarOpen = false;
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
}
