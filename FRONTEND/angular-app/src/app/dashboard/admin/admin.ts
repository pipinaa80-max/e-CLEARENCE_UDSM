import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AdminService } from '../../core/services/admin.service';
import { ProjectAdminService, ProjectDashboard, ProjectConfig } from '../../core/services/project-admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class AdminDashboard implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly adminService = inject(AdminService);
  private readonly router = inject(Router);
  private readonly projectAdminService = inject(ProjectAdminService);

  sidebarOpen = false;
  showAddForm = false;
  activeTab: 'overview' | 'users' | 'clearance' | 'upload' | 'dashboards' | 'theme' = 'overview';

  users: any[] = [];
  roles: string[] = [];
  clearanceRequests: any[] = [];

  userSearchTerm: string = '';
  userRoleFilter: string = '';
  userStatusFilter: '' | 'active' | 'inactive' = '';
  requestSearchTerm: string = '';

  stats = {
    totalStudents: 0,
    totalRequests: 0,
    completed: 0,
    pending: 0,
    rejected: 0,
    totalStaff: 0,
    pendingUsers: 0
  };

  newUser = {
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    registrationNumber: '',
    password: '',
    role: 'Student',
    department: '',
    programme: '',
    faculty: '',
    yearOfStudy: ''
  };

  selectedFile: File | null = null;
  message: string = '';
  isError: boolean = false;
  projectConfig: ProjectConfig | null = null;
  newDashboard = { id: '', name: '', description: '' };

  get filteredUsers(): any[] {
    const term = this.userSearchTerm.toLowerCase();
    return this.users.filter(u => {
      const matchesSearch = !term ||
        u.fullName?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.registrationNumber?.toLowerCase().includes(term) ||
        u.role?.toLowerCase().includes(term);

      // Normalize roles for comparison
      const userRole = String(u.role ?? '').toUpperCase();
      const filterRole = String(this.userRoleFilter ?? '').toUpperCase();
      const matchesRole = !filterRole || userRole === filterRole;

      const matchesStatus = !this.userStatusFilter ||
        (this.userStatusFilter === 'active' ? u.isActive !== false : u.isActive === false);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }

  clearUserFilters(): void {
    this.userSearchTerm = '';
    this.userRoleFilter = '';
    this.userStatusFilter = '';
  }

  get filteredRequests(): any[] {
    if (!this.requestSearchTerm) return this.clearanceRequests;
    const term = this.requestSearchTerm.toLowerCase();
    return this.clearanceRequests.filter(r =>
      r.student?.fullName?.toLowerCase().includes(term) ||
      r.student?.registrationNumber?.toLowerCase().includes(term) ||
      r.department?.toLowerCase().includes(term) ||
      r.status?.toLowerCase().includes(term) ||
      r.currentStage?.toLowerCase().includes(term)
    );
  }

  ngOnInit(): void {
    const token = this.authService.getToken();
    if (!token) {
      console.warn('No token found. Redirecting to login.');
      this.logout();
      return;
    }

    this.loadData();
    this.loadProjectConfig();
  }

  loadData(): void {
    this.adminService.getAllUsers().subscribe({
      next: (users) => {
        console.log('📦 Admin fetched users:', users);
        if (Array.isArray(users)) {
          this.users = users.map(u => this.authService.mapUserResponse(u));
          console.log('📦 Admin mapped users:', this.users);
          this.calculateStats();
        } else {
          console.error('📦 Admin users data is not an array:', users);
          this.users = [];
        }
      },
      error: (err) => {
        console.error('Error loading users', err);
        this.message = 'Failed to load users. Please check backend connection.';
        this.isError = true;
      }
    });

    this.adminService.getAllRoles().subscribe({
      next: (roles) => {
        // Map raw enum strings to user-friendly roles and ensure uniqueness
        const mappedRoles = roles.map(r => this.authService.mapRole(r));
        this.roles = Array.from(new Set(mappedRoles)).sort();
        console.log('📦 Admin unique roles:', this.roles);
      },
      error: (err) => console.error('Error loading roles', err)
    });

    this.adminService.getAllClearanceRequests().subscribe({
      next: (requests) => {
        this.clearanceRequests = requests;
        this.calculateStats();
      },
      error: (err) => console.error('Error loading requests', err)
    });
  }

  calculateStats(): void {
    this.stats.totalStudents = this.users.filter(u => String(u.role ?? '').toUpperCase() === 'STUDENT').length;
    this.stats.totalStaff = this.users.filter(u => String(u.role ?? '').toUpperCase() !== 'STUDENT').length;
    this.stats.pendingUsers = this.users.filter(u => u.isActive === false).length;
    this.stats.totalRequests = this.clearanceRequests.length;
    this.stats.completed = this.clearanceRequests.filter(r => ['COMPLETED', 'APPROVED', 'CLEARED'].includes(String(r.status ?? '').toUpperCase())).length;
    this.stats.pending = this.clearanceRequests.filter(r => String(r.status ?? '').toUpperCase() === 'PENDING').length;
    this.stats.rejected = this.clearanceRequests.filter(r => String(r.status ?? '').toUpperCase() === 'REJECTED').length;
  }

  loadProjectConfig(): void {
    this.projectAdminService.getProjectConfig().subscribe({
      next: (config) => {
        console.log('Project config loaded:', config);
        this.projectConfig = config;
      },
      error: (err) => console.error('Error loading project config', err)
    });
  }

  setTab(tab: 'overview' | 'users' | 'clearance' | 'upload' | 'dashboards' | 'theme'): void {
    this.activeTab = tab;
    this.message = '';
  }

  addDashboard(): void {
    this.projectAdminService.createDashboard(this.newDashboard).subscribe({ next: () => { this.message = 'Dashboard added to this project'; this.isError = false; this.newDashboard = { id: '', name: '', description: '' }; this.loadProjectConfig(); }, error: (err) => { this.message = err.error?.message || 'Failed to add dashboard'; this.isError = true; } });
  }

  updateDashboard(dashboard: ProjectDashboard): void {
    this.projectAdminService.updateDashboard(dashboard).subscribe({ next: () => { this.message = 'Dashboard updated'; this.isError = false; }, error: () => { this.message = 'Failed to update dashboard'; this.isError = true; } });
  }

  deleteDashboard(id: string): void {
    if (!confirm('Delete this dashboard from your project?')) return;
    this.projectAdminService.deleteDashboard(id).subscribe({ next: () => { this.message = 'Dashboard deleted'; this.isError = false; this.loadProjectConfig(); }, error: () => { this.message = 'Failed to delete dashboard'; this.isError = true; } });
  }

  saveTheme(): void {
    if (!this.projectConfig) return;
    this.projectAdminService.updateBranding(this.projectConfig.branding).subscribe({
      next: (branding) => {
        this.projectConfig = this.projectConfig ? { ...this.projectConfig, branding } : { projectId: '', branding, dashboards: [] };
        this.projectAdminService.setSavedBranding(branding);
        window.dispatchEvent(new CustomEvent('project-branding-updated', { detail: { branding } }));
        this.message = 'Project theme saved';
        this.isError = false;
      },
      error: () => { this.message = 'Failed to save project theme'; this.isError = true; }
    });
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  addUser(): void {
    this.adminService.createUser(this.newUser).subscribe({
      next: (res) => {
        // Check for success property in ApiResponse
        if (res && res.success !== false) {
          this.message = res.message || 'User added successfully';
          this.isError = false;
          this.loadData();
          this.resetUserForm();
        } else {
          this.message = 'Failed: ' + (res.message || 'Unknown error');
          this.isError = true;
        }
      },
      error: (err) => {
        this.message = 'Failed to add user: ' + (err.error?.message || err.message);
        this.isError = true;
      }
    });
  }

  resetUserForm(): void {
    this.newUser = {
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      registrationNumber: '',
      password: '',
      role: 'STUDENT',
      department: '',
      programme: '',
      faculty: '',
      yearOfStudy: ''
    };
  }

  deleteUser(userId: string): void {
    if (confirm('Are you sure you want to delete this user? This will also delete related clearance records.')) {
      this.adminService.deleteUser(userId).subscribe({
        next: () => {
          this.message = 'User deleted successfully';
          this.isError = false;
          this.loadData();
        },
        error: (err) => {
          this.message = 'Failed to delete user';
          this.isError = true;
        }
      });
    }
  }

  updateRole(userId: string, newRole: string): void {
    this.adminService.updateUserRole(userId, newRole).subscribe({
      next: () => {
        this.message = 'Role updated successfully';
        this.isError = false;
        this.loadData();
      },
      error: (err) => {
        this.message = 'Failed to update role';
        this.isError = true;
      }
    });
  }

  updateStatus(userId: string, isActive: boolean): void {
    this.adminService.updateUserStatus(userId, isActive).subscribe({
      next: () => {
        this.message = `User ${isActive ? 'activated' : 'deactivated'} successfully`;
        this.isError = false;
      },
      error: () => {
        this.message = 'Failed to update user status';
        this.isError = true;
        this.loadData();
      }
    });
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
  }

  uploadFile(): void {
    if (!this.selectedFile) return;

    this.adminService.bulkUploadUsers(this.selectedFile).subscribe({
      next: (res) => {
        this.message = res.message;
        this.isError = false;
        this.loadData();
        this.selectedFile = null;
      },
      error: (err) => {
        this.message = 'Upload failed: ' + (err.error?.message || err.message);
        this.isError = true;
      }
    });
  }

  importBrowserData(): void {
    this.adminService.importCurrentLocalStorage().subscribe({
      next: (result) => {
        this.message = result.message || 'Browser data imported into clearance_db';
        this.isError = false;
        this.loadData();
      },
      error: (err) => {
        this.message = 'Browser data import failed: ' + (err.error?.message || err.message);
        this.isError = true;
      }
    });
  }
}
