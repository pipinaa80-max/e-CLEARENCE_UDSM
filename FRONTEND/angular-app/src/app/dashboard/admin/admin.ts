import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AdminService } from '../../core/services/admin.service';

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

  sidebarOpen = false;
  showAddForm = false;
  activeTab: 'overview' | 'users' | 'clearance' | 'upload' = 'overview';

  users: any[] = [];
  roles: string[] = [];
  clearanceRequests: any[] = [];

  userSearchTerm: string = '';
  requestSearchTerm: string = '';

  stats = {
    totalStudents: 0,
    totalRequests: 0,
    completed: 0,
    pending: 0,
    rejected: 0,
    totalStaff: 0
  };

  newUser = {
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

  selectedFile: File | null = null;
  message: string = '';
  isError: boolean = false;

  get filteredUsers(): any[] {
    if (!this.userSearchTerm) return this.users;
    const term = this.userSearchTerm.toLowerCase();
    return this.users.filter(u =>
      u.fullName?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.registrationNumber?.toLowerCase().includes(term) ||
      u.role?.toLowerCase().includes(term)
    );
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

    if (token.startsWith('local-')) {
      console.warn('Mock token detected. Logging out to refresh session.');
      this.logout();
      return;
    }
    this.loadData();
  }

  loadData(): void {
    this.adminService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.calculateStats();
      },
      error: (err) => console.error('Error loading users', err)
    });

    this.adminService.getAllRoles().subscribe({
      next: (roles) => {
        this.roles = roles;
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
    this.stats.totalStudents = this.users.filter(u => u.role === 'STUDENT').length;
    this.stats.totalStaff = this.users.filter(u => u.role !== 'STUDENT').length;
    this.stats.totalRequests = this.clearanceRequests.length;
    this.stats.completed = this.clearanceRequests.filter(r => r.status === 'COMPLETED' || r.status === 'APPROVED' || r.status === 'CLEARED').length;
    this.stats.pending = this.clearanceRequests.filter(r => r.status === 'PENDING').length;
    this.stats.rejected = this.clearanceRequests.filter(r => r.status === 'REJECTED').length;
  }

  setTab(tab: 'overview' | 'users' | 'clearance' | 'upload'): void {
    this.activeTab = tab;
    this.message = '';
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
        this.message = 'User added successfully';
        this.isError = false;
        this.loadData();
        this.resetUserForm();
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

  updateRole(userId: string, event: any): void {
    const newRole = event.target.value;
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
}
