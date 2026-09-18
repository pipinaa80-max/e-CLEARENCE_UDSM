import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AdminService } from '../../core/services/admin.service';
import { ProjectAdminService, ProjectDashboard, ProjectConfig } from '../../core/services/project-admin.service';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

interface DepartmentData {
  [department: string]: string[];
}

interface AcademicUnitData {
  [college: string]: DepartmentData;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardHeaderComponent],
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

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  users: any[] = [];
  selectedUserIds: Set<string> = new Set();
  roles: string[] = [];
  clearanceRequests: any[] = [];

  userSearchTerm: string = '';
  userRoleFilter: string = '';
  userStatusFilter: '' | 'active' | 'inactive' = '';
  requestSearchTerm: string = '';

  get isAllSelected(): boolean {
    const filtered = this.filteredUsers;
    return filtered.length > 0 && filtered.every(u => this.selectedUserIds.has(u.id));
  }

  toggleSelectAll(event: any): void {
    if (event.target.checked) {
      this.filteredUsers.forEach(u => this.selectedUserIds.add(u.id));
    } else {
      this.filteredUsers.forEach(u => this.selectedUserIds.delete(u.id));
    }
  }

  toggleSelection(userId: string): void {
    if (this.selectedUserIds.has(userId)) {
      this.selectedUserIds.delete(userId);
    } else {
      this.selectedUserIds.add(userId);
    }
  }

  deleteSelectedUsers(): void {
    const ids = Array.from(this.selectedUserIds);
    if (ids.length === 0) return;

    if (confirm(`Are you sure you want to delete ${ids.length} selected users? This action is permanent.`)) {
      this.adminService.deleteUsers(ids).subscribe({
        next: (res) => {
          this.message = res.message || 'Users deleted successfully';
          this.isError = false;
          this.selectedUserIds.clear();
          this.loadData();
        },
        error: (err) => {
          this.message = 'Failed to delete selected users';
          this.isError = true;
        }
      });
    }
  }

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
    role: 'STUDENT',
    college: '',
    department: '',
    programme: '',
    faculty: '',
    yearOfStudy: ''
  };

  readonly academicUnits: AcademicUnitData = {
    'College of Agricultural Sciences and Food Technology (CoAF)': {
      'Agricultural Economics and Business': [
        'BSc in Agricultural and Natural Resources Economics and Business'
      ],
      'Agricultural Engineering': [
        'BSc in Agricultural Engineering and Mechanization'
      ],
      'Crop Sciences and Beekeeping Technology': [
        'BSc in Beekeeping Science and Technology',
        'BSc in Crop Science and Technology'
      ],
      'Food Science and Technology': [
        'BSc in Food Science and Technology'
      ]
    },
    'College of Engineering and Technology (CoET)': {
      'Chemical and Process Engineering': [
        'BSc in Chemical and Process Engineering'
      ],
      'Electrical Engineering': [
        'BSc in Electrical Engineering'
      ],
      'Structural and Construction Engineering': [
        'BSc in Civil Engineering',
        'Bachelor of Architecture',
        'BSc in Quantity Surveying'
      ],
      'Transportation and Geotechnical Engineering': [
        'BSc in Geomatics'
      ],
      'Mechanical and Industrial Engineering': [
        'BSc in Mechanical Engineering',
        'BSc in Industrial Engineering',
        'BSc in Textile Engineering',
        'BSc in Textile Design and Technology'
      ],
      'Water Resources Engineering': []
    },
    'College of Humanities (CoHU)': {
      'Archaeology and Heritage Studies': [
        'BA in Archaeology',
        'BA in Archaeology and History',
        'BA in Archaeology and Geography',
        'BA in Heritage Management',
        'BA in History, Cultural Heritage Management & Tourism'
      ],
      'Creative Arts': [
        'BA in Art and Design',
        'BA in Theatre Arts',
        'BA in Film and Television Studies',
        'BA in Music'
      ],
      'Foreign Languages and Linguistics': [
        'BA in Language Studies',
        'BA with Education (Chinese and English)'
      ],
      'Centre for Communication Studies': [
        'BA in Communication Studies'
      ],
      'History': [
        'BA in History',
        'BA in History and Political Science',
        'BA in Diplomatic and Military History'
      ],
      'Literature': [
        'BA in Literature'
      ],
      'Philosophy and Religious Studies': [
        'BA in Philosophy and Ethics'
      ]
    },
    'College of Information and Communication Technologies (CoICT)': {
      'Department of Computer Science & Engineering': [
        'BSc in Computer Science',
        'BSc in Computer Engineering and Information Technology',
        'BSc in Business Information Technology'
      ],
      'Department of Electronics and Telecommunications Engineering': [
        'BSc in Electronic Science and Communication',
        'BSc in Telecommunications Engineering',
        'BSc in Electronics Engineering'
      ]
    },
    'College of Natural and Applied Sciences (CoNAS)': {
      'Botany': [
        'BSc in Botanical Sciences'
      ],
      'Chemistry': [
        'BSc in Chemistry',
        'BSc in Petroleum Chemistry',
        'BSc in Chemistry and Physics'
      ],
      'Mathematics': [
        'BSc in Mathematics and Statistics',
        'BSc in Actuarial Sciences'
      ],
      'Molecular Biology and Biotechnology': [
        'BSc in Molecular Biology and Biotechnology',
        'BSc in Microbiology',
        'BSc in Applied Microbiology and Chemistry'
      ],
      'Physics': [
        'BSc in Physics (Medical Physics)',
        'BSc in Meteorology'
      ],
      'Zoology and Wildlife Conservation': [
        'BSc in Applied Zoology',
        'BSc in Wildlife Science and Conservation'
      ]
    },
    'College of Social Sciences (CoSS)': {
      'Geography': [
        'BA in Geography and Environmental Studies'
      ],
      'Political Science and Public Administration': [
        'BA in Political Science and Public Administration'
      ],
      'Sociology and Anthropology': [
        'BA in Anthropology',
        'BA in Psychology',
        'BA in Sociology',
        'BA in Social Work'
      ],
      'Statistics': [
        'BA in Statistics'
      ],
      'Information Studies Unit': [
        'BA in Library and Information Studies'
      ]
    },
    'University of Dar es Salaam Business School (UDBS)': {
      'Accounting': [
        'Bachelor of Commerce in Accounting'
      ],
      'Finance': [
        'Bachelor of Commerce in Banking and Financial Services',
        'Bachelor of Commerce in Finance'
      ],
      'General Management': [
        'Bachelor of Business Administration',
        'Bachelor of Commerce in Human Resources Management',
        'Bachelor of Commerce in Tourism and Hospitality Management',
        'Bachelor of Commerce in Procurement and Supply Chain Management'
      ],
      'Marketing': [
        'Bachelor of Commerce in Marketing'
      ]
    },
    'School of Education (SoED)': {
      'Educational Foundations, Management and Lifelong Learning': [
        'Bachelor of Education in Adult and Community Education'
      ],
      'Educational Psychology and Curriculum Studies': [
        'Bachelor of Education in Early Childhood Education',
        'Bachelor of Education in Psychology'
      ],
      'Physical Education and Sport Sciences': [
        'Bachelor of Education in Physical Education and Sport Sciences'
      ]
    },
    'University of Dar es Salaam School of Law (UDSoL)': {
      'Public Law': [
        'Bachelor of Laws (LL.B)'
      ],
      'Private Law': [
        'Bachelor of Laws (LL.B)'
      ],
      'Economic Law': [
        'Bachelor of Laws (LL.B)'
      ]
    },
    'University of Dar es Salaam School of Economics (UDSE)': {
      'Economics': [
        'BA in Economics'
      ],
      'Applied Economics': [
        'BA in Economics and Statistics'
      ]
    },
    'School of Journalism and Mass Communication (SJMC)': {
      'Journalism and Mass Communication': [
        'BA in Journalism',
        'BA in Mass Communication',
        'BA in Public Relations and Advertising'
      ]
    },
    'School of Aquatic Sciences and Fisheries Technology (SoAF)': {
      'Aquatic Sciences and Fisheries Technology': [
        'BSc in Aquatic Sciences and Fisheries'
      ]
    },
    'School of Mines and Geosciences (SoMG)': {
      'Geosciences': [
        'BSc in Geology',
        'BSc in Geophysics',
        'BSc in Engineering Geology',
        'BSc in Geology and Geothermal Resources',
        'BSc in Petroleum Geology',
        'BSc with Geology'
      ],
      'Mining and Mineral Processing Engineering': [
        'BSc in Mining Engineering',
        'BSc in Metallurgy and Mineral Processing Engineering'
      ],
      'Petroleum Science and Engineering': [
        'BSc in Petroleum Engineering'
      ]
    },
    'Institute of Kiswahili Studies (IKS)': {
      'Kiswahili': [
        'BA in Kiswahili'
      ]
    },
    'Institute of Development Studies (IDS)': {
      'Development Studies': [
        'BA in Development Studies'
      ]
    },
    'Institute of Marine Sciences (IMS)': {
      'Marine and Coastal Resources / Marine Sciences': [
        'Bachelor of Science in Marine Sciences'
      ]
    },
    'Dar es Salaam University College of Education (DUCE)': {
      'Education': [
        'Bachelor of Arts with Education',
        'Bachelor of Science with Education',
        'Bachelor of Arts in Disaster Risk Management'
      ]
    },
    'Mkwawa University College of Education (MUCE)': {
      'Education': [
        'Bachelor of Arts with Education',
        'Bachelor of Science with Education',
        'Bachelor of Science in Chemistry'
      ]
    },
    'Mbeya College of Health and Allied Sciences (MCHAS)': {
      'Health Sciences': [
        'Doctor of Medicine (MD)',
        'Doctor of Dental Surgery (DDS)'
      ]
    }
  };

  get collegeList(): string[] {
    return Object.keys(this.academicUnits);
  }

  get departments(): string[] {
    const college = this.newUser.college;
    if (!college) return [];
    return Object.keys(this.academicUnits[college] || {});
  }

  get programmeOptions(): string[] {
    const college = this.newUser.college;
    const department = this.newUser.department;
    if (!college || !department) return [];
    return this.academicUnits[college]?.[department] || [];
  }

  onCollegeChange(): void {
    this.newUser.department = '';
    this.newUser.programme = '';
  }

  onDepartmentChange(): void {
    this.newUser.programme = '';
  }

  selectedFile: File | null = null;
  message: string = '';
  isError: boolean = false;
  projectConfig: ProjectConfig | null = null;
  newDashboard = { id: '', name: '', description: '' };
  newFooterLink = { label: '', url: '' };

  addFooterLink(): void {
    if (!this.projectConfig) return;
    const label = this.newFooterLink.label.trim();
    const url = this.newFooterLink.url.trim();

    if (!label || !url) {
      this.message = 'Both label and URL are required for a footer link';
      this.isError = true;
      return;
    }

    if (!this.projectConfig.branding.footerLinks) {
      this.projectConfig.branding.footerLinks = [];
    }

    this.projectConfig.branding.footerLinks.push({ label, url });
    this.newFooterLink = { label: '', url: '' };
    this.message = 'Link added to list (click Save Theme to apply)';
    this.isError = false;
  }

  removeFooterLink(index: number): void {
    if (!this.projectConfig?.branding.footerLinks) return;
    this.projectConfig.branding.footerLinks.splice(index, 1);
  }

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
        if (config && config.branding && !config.branding.footerLinks) {
          config.branding.footerLinks = [];
        }
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
    const submittedBranding = { ...this.projectConfig.branding };
    this.projectAdminService.updateBranding(submittedBranding).subscribe({
      next: (branding) => {
        const savedBranding = { ...submittedBranding, ...branding };
        this.projectConfig = this.projectConfig ? { ...this.projectConfig, branding: savedBranding } : { projectId: '', branding: savedBranding, dashboards: [] };
        this.projectAdminService.setSavedBranding(savedBranding);
        window.dispatchEvent(new CustomEvent('project-branding-updated', { detail: { branding: savedBranding } }));
        this.message = 'Project theme saved';
        this.isError = false;
      },
      error: () => { this.message = 'Failed to save project theme'; this.isError = true; }
    });
  }

  previewBackground(backgroundUrl: string): void {
    if (this.projectConfig) this.projectConfig.branding.backgroundUrl = backgroundUrl;
    window.dispatchEvent(new CustomEvent('project-branding-updated', {
      detail: { branding: { backgroundUrl } }
    }));
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
      college: '',
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
