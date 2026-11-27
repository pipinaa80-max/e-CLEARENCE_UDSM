import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AdminService } from '../../core/services/admin.service';
import { isPostgraduateAward, isPostgraduateEntity } from '../../core/utils/postgraduate.util';
import { normalizeBrandAssetUrl, ProjectAdminService, ProjectDashboard, ProjectConfig } from '../../core/services/project-admin.service';
import { AwardService } from '../../core/services/award.service';
import { SponsorService } from '../../core/services/sponsor.service';
import { Sponsor } from '../../core/models/sponsor.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';
import { DEFAULT_UDSM_BRAND_COLOR, normalizeUdsmBrandColor, UDSM_BRAND_COLORS } from '../../core/config/udsm-brand-colors';
import { NotificationService } from '../../core/services/notification.service';

interface DepartmentData {
  [department: string]: string[];
}

interface AcademicUnitData {
  [college: string]: DepartmentData;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class AdminDashboard implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly adminService = inject(AdminService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly projectAdminService = inject(ProjectAdminService);
  private readonly awardService = inject(AwardService);
  private readonly sponsorService = inject(SponsorService);
  private readonly notificationService = inject(NotificationService);
  private unreadSub?: Subscription;

  @ViewChild('bulkUploadInput') bulkUploadInput?: ElementRef<HTMLInputElement>;

  Math = Math;
  sidebarOpen = false;
  unreadNotifications = 0;
  isSubmittingUser = false;
  isDeletingUsers = false;
  isSavingSponsor = false;
  isSavingDashboard = false;
  isSavingTheme = false;
  showAddForm = false;
  readonly themeColors = UDSM_BRAND_COLORS;
  themeColorDropdownOpen = false;
  activeTab: 'users' | 'clearance' | 'upload' | 'dashboards' | 'theme' | 'awards' | 'sponsors' = 'users';
  institutionalMenuOpen = true;

  toggleInstitutionalMenu(): void {
    this.institutionalMenuOpen = !this.institutionalMenuOpen;
  }

  get isInstitutionalTabActive(): boolean {
    return ['upload', 'dashboards', 'theme', 'awards', 'sponsors'].includes(this.activeTab);
  }
  newAwardName: string = '';
  awardsList: string[] = [];
  editingAwardName: string | null = null;
  editedAwardName = '';

  // Sponsors Management
  sponsorsList: Sponsor[] = [];
  filteredSponsors: Sponsor[] = [];
  newSponsorName: string = '';
  newSponsorCode: string = '';
  newSponsorDescription: string = '';
  editingSponsorId: string | null = null;
  editedSponsorName = '';
  editedSponsorCode = '';
  editedSponsorDescription = '';
  sponsorSearchTerm = '';

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get userInitials(): string {
    const name = String(this.currentUser?.fullName || 'AD');
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase() || '')
      .join('') || 'AD';
  }

  users: any[] = [];
  selectedUserIds: Set<string> = new Set();
  roles: string[] = [
    'Student',
    'Academic Staff',
    'Lecturer',
    'Department',
    'Principal',
    'Convocation',
    'Library',
    'Finance',
    'Games Coach',
    'Hall Warden',
    'USAB',
    'DARUSO',
    'Dean of Students',
    'Smart Card',
    'Workshop',
    'Laboratory',
    'Director of Undergraduate Studies',
    'Director of Postgraduate Studies',
    'DUS Examination Office',
    'Station Secretary',
    'Supervisor',
    'Administrator'
  ];
  clearanceRequests: any[] = [];

  userSearchTerm: string = '';
  userRoleFilter: string = '';
  userStatusFilter: '' | 'active' | 'inactive' = '';
  requestSearchTerm: string = '';
  requestStatusFilter: '' | 'COMPLETED' | 'PENDING' | 'REJECTED' = '';

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
    if (ids.length === 0 || this.isDeletingUsers) return;

    if (confirm(`Are you sure you want to delete ${ids.length} selected users? This action is permanent.`)) {
      this.isDeletingUsers = true;
      this.adminService.deleteUsers(ids).subscribe({
        next: (res) => {
          this.isDeletingUsers = false;
          this.message = res.message || 'Users deleted successfully';
          this.isError = false;
          this.selectedUserIds.clear();
          this.loadData();
        },
        error: (err) => {
          this.isDeletingUsers = false;
          this.message = err?.error?.message || 'Failed to delete selected users';
          this.isError = true;
        }
      });
    }
  }

  stats = {
    totalStudents: 0,
    totalPostgraduates: 0,
    totalUndergraduates: 0,
    totalRequests: 0,
    completed: 0,
    pending: 0,
    rejected: 0,
    totalStaff: 0,
    pendingUsers: 0
  };

  userAwardFilter: string = '';

  newUser = {
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    registrationNumber: '',
    password: '',
    role: 'Student',
    college: '',
    department: '',
    programme: '',
    faculty: '',
    yearOfStudy: '',
    award: 'Bachelor Degree',
    isPostgraduate: false
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
      'Natural and Applied Sciences': [
        'BSc with Education'
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
      'Information Studies': [
        'BA in Library and Information Studies'
      ],
      'Political Science and Public Administration': [
        'BA in Political Science and Public Administration'
      ],
      'Social Sciences': [
        'BA with Education'
      ],
      'Sociology': [
        'BA in Anthropology',
        'BA in Psychology',
        'BA in Sociology',
        'BA in Social Work'
      ],
      'Statistics': [
        'BA in Statistics'
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
      'Marine Sciences': [
        'Bachelor of Science in Marine Sciences'
      ]
    },
    'Mineral Resources Institute (MRI)': {
      'Environmental Engineering and Management': [
        'Diploma in Environmental Engineering and Management in Mines'
      ],
      'Geology and Mineral Exploration': [
        'Diploma in Geology and Mineral Exploration'
      ],
      'Land and Mine Surveying': [
        'Diploma in Land and Mine Surveying'
      ],
      'Mining Engineering': [
        'Diploma in Mining Engineering'
      ],
      'Petroleum Geosciences and Exploration': [
        'Diploma in Petroleum Geosciences and Exploration'
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
      'Clinical Medicine': [
        'Doctor of Medicine (MD)',
        'Doctor of Dental Surgery (DDS)'
      ],
      'Pharmacy': [
        'Bachelor of Pharmacy'
      ],
      'Nursing': [
        'Bachelor of Science in Nursing'
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

  private readonly postgraduateProgrammesByCollege: Record<string, string[]> = {
    'CoICT': [
      'Master of Science in Computer Science',
      'Master of Science in Data Science',
      'Master of Science in Electronics Engineering and Information Technology',
      'Master of Science in Telecommunications Engineering',
      'PhD in Computer Science',
      'PhD in Electronics Engineering and Information Technology'
    ],
    'CoET': [
      'Master of Science in Civil Engineering',
      'Master of Science in Electrical Power Engineering',
      'Master of Science in Mechanical Engineering',
      'Master of Science in Chemical Engineering',
      'PhD in Engineering'
    ],
    'CoNAS': [
      'Master of Science in Mathematics',
      'Master of Science in Physics',
      'Master of Science in Chemistry',
      'Master of Science in Applied Microbiology',
      'Master of Science in Biodiversity Conservation',
      'PhD in Natural and Applied Sciences'
    ],
    'CoHU': [
      'Master of Arts in Linguistics',
      'Master of Arts in Literature',
      'Master of Arts in History',
      'Master of Arts in Archaeology',
      'PhD in Humanities'
    ],
    'CoSS': [
      'Master of Arts in Economics',
      'Master of Arts in Political Science and Public Administration',
      'Master of Arts in Sociology',
      'Master of Arts in Geography and Environmental Management',
      'PhD in Social Sciences'
    ],
    'CoAF': [
      'Master of Science in Agricultural Engineering',
      'Master of Science in Food Science and Technology',
      'PhD in Agricultural Sciences'
    ],
    'UDBS': [
      'Master of Business Administration (MBA)',
      'Master of International Business (MIB)',
      'Master of Finance and Accounting',
      'PhD in Business Administration'
    ],
    'UDSoL': [
      'Master of Laws (LL.M)',
      'Postgraduate Diploma in Law',
      'PhD in Law'
    ],
    'SoED': [
      'Master of Education (MEd)',
      'Master of Arts in Education (MA Ed)',
      'Postgraduate Diploma in Education (PGDE)',
      'PhD in Education'
    ],
    'SJMC': [
      'Master of Arts in Mass Communication',
      'Postgraduate Diploma in Mass Communication',
      'PhD in Mass Communication'
    ],
    'SoMG': [
      'Master of Science in Geology',
      'Master of Science in Petroleum Geology',
      'PhD in Geosciences'
    ],
    'SoAF': [
      'Master of Science in Marine Sciences',
      'Master of Science in Fisheries and Aquaculture',
      'PhD in Aquatic Sciences'
    ],
    'MCHAS': [
      'Master of Medicine (MMed)',
      'Master of Public Health (MPH)',
      'PhD in Health Sciences'
    ],
    'DUCE': [
      'Master of Education (MEd)',
      'Postgraduate Diploma in Education (PGDE)',
      'PhD in Education'
    ],
    'MUCE': [
      'Master of Education (MEd)',
      'Postgraduate Diploma in Education (PGDE)',
      'PhD in Education'
    ]
  };

  private readonly defaultPostgraduateProgrammes: string[] = [
    'Master of Science (MSc)',
    'Master of Arts (MA)',
    'Master of Business Administration (MBA)',
    'Master of Education (MEd)',
    'Master of Laws (LL.M)',
    'Postgraduate Diploma (PGD)',
    'Doctor of Philosophy (PhD)'
  ];

  get programmeOptions(): string[] {
    const college = this.newUser.college;
    const department = this.newUser.department;
    if (this.newUser.isPostgraduate) {
      const collegePg = college ? this.postgraduateProgrammesByCollege[college] : undefined;
      return collegePg?.length ? collegePg : this.defaultPostgraduateProgrammes;
    }
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

  get normalizedSelectedRole(): string {
    const raw = String(this.newUser.role || '').toUpperCase().trim();
    return raw.replace(/_/g, ' ');
  }

  get isStudentRole(): boolean {
    return this.normalizedSelectedRole === 'STUDENT';
  }

  get isPrincipalRole(): boolean {
    return this.normalizedSelectedRole === 'PRINCIPAL';
  }

  get isDepartmentalStaffRole(): boolean {
    const r = this.normalizedSelectedRole;
    return (
      r === 'ACADEMIC STAFF' ||
      r === 'LECTURER' ||
      r === 'SUPERVISOR' ||
      r === 'RESEARCH SUPERVISOR' ||
      r === 'DEPARTMENT' ||
      r === 'DEPARTMENT OFFICER' ||
      r === 'WORKSHOP' ||
      r === 'WORKSHOP OFFICER' ||
      r === 'LABORATORY' ||
      r === 'LABORATORY OFFICER'
    );
  }

  get showCollege(): boolean {
    return this.isStudentRole || this.isDepartmentalStaffRole || this.isPrincipalRole;
  }

  get showDepartment(): boolean {
    return this.isStudentRole || this.isDepartmentalStaffRole;
  }

  get showProgramme(): boolean {
    return this.isStudentRole;
  }

  get isCentralOfficeRole(): boolean {
    return !this.showCollege && !this.showDepartment && !this.showProgramme;
  }

  get idFieldLabel(): string {
    return this.isStudentRole ? 'Registration Number' : 'Staff ID / PF Number';
  }

  get idFieldPlaceholder(): string {
    return this.isStudentRole ? 'e.g. 2021-04-01234' : 'e.g. PF-10492 or STF-001 (Optional)';
  }

  get roleBadgeDescription(): string {
    if (this.isStudentRole) {
      if (this.newUser.isPostgraduate) {
        return '🎓 Postgraduate Student — Requires College, Department, Programme, and Award Level. Routes through Convocation, Parallel Offices, Department, Principal, Finance, and Research Supervisor (Final Check). Requires Undergraduate Certificate upload.';
      }
      return '📘 Undergraduate Student — Requires College, Department, and Programme selection. Standard 5-stage clearance flow.';
    }
    if (this.isPrincipalRole) {
      return 'College Principal — Oversees the entire selected College (no individual department).';
    }
    if (this.isDepartmentalStaffRole) {
      return 'Academic / Departmental Staff — Associated with College and Department. Programme not required.';
    }
    return 'Institutional / Central Unit — University-wide office (College, Department, and Programme not required).';
  }

  onAwardChange(): void {
    const award = (this.newUser.award || '').toLowerCase();
    if (award.includes('postgraduate') || award.includes('master') || award.includes('phd') || award.includes('doctor')) {
      this.newUser.isPostgraduate = true;
    } else if (award.includes('bachelor') || award.includes('diploma') || award.includes('certificate')) {
      this.newUser.isPostgraduate = false;
    }
  }

  onPostgraduateToggle(): void {
    if (this.newUser.isPostgraduate) {
      const award = (this.newUser.award || '').toLowerCase();
      if (!award.includes('postgraduate') && !award.includes('master') && !award.includes('phd')) {
        this.newUser.award = 'Master Degree';
      }
    } else {
      const award = (this.newUser.award || '').toLowerCase();
      if (award.includes('postgraduate') || award.includes('master') || award.includes('phd')) {
        this.newUser.award = 'Bachelor Degree';
      }
    }
  }

  onRoleChange(): void {
    if (this.isCentralOfficeRole) {
      this.newUser.college = '';
      this.newUser.department = this.getDefaultDepartmentForRole(this.newUser.role);
      this.newUser.programme = '';
    } else if (this.isPrincipalRole) {
      this.newUser.department = '';
      this.newUser.programme = '';
    } else if (this.isDepartmentalStaffRole) {
      this.newUser.programme = '';
      if (this.newUser.department && !this.departments.includes(this.newUser.department)) {
        this.newUser.department = '';
      }
    } else if (this.isStudentRole) {
      if (this.newUser.department && !this.departments.includes(this.newUser.department)) {
        this.newUser.department = '';
      }
      if (!this.newUser.award) {
        this.newUser.award = 'Bachelor Degree';
      }
    }
  }

  getDefaultDepartmentForRole(role: string): string {
    const r = (role || '').toUpperCase().trim();
    if (r.includes('LIBRARY')) return 'Library Services';
    if (r.includes('FINANCE')) return 'Bursar & Treasury';
    if (r.includes('ICT')) return 'Centre for Information and Communication Technology';
    if (r.includes('CONVOCATION')) return 'Convocation Relations';
    if (r.includes('GAMES') || r.includes('COACH')) return 'Sports and Games Department';
    if (r.includes('HALL') || r.includes('WARDEN') || r.includes('USAB')) return 'Accommodation Bureau (USAB)';
    if (r.includes('DARUSO')) return 'DARUSO Student Union';
    if (r.includes('DEAN')) return 'Dean of Students Office';
    if (r.includes('SMART')) return 'Smart Card Unit';
    if (r.includes('POSTGRADUATE') || r.includes('DPGS')) return 'Directorate of Postgraduate Studies';
    if (r.includes('STATION')) return 'Collection Station Operations';
    if (r.includes('UNDERGRADUATE') || r.includes('DUS')) return 'Directorate of Undergraduate Studies';
    if (r.includes('ADMIN')) return 'University Administration';
    return '';
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

  filteredUsers: any[] = [];
  paginatedUsers: any[] = [];
  totalPages: number = 1;

  // Pagination State for User Management Table
  currentPage: number = 1;
  pageSize: number = 25;
  readonly maxFileUploadSizeBytes: number = 10 * 1024 * 1024; // 10MB file limit

  applyUserFiltersAndPagination(): void {
    const term = (this.userSearchTerm || '').trim().toLowerCase();
    const filterRole = String(this.userRoleFilter ?? '').toUpperCase();
    const statusFilter = this.userStatusFilter;

    this.filteredUsers = this.users.filter(u => {
      const matchesSearch = !term ||
        (u.fullName && u.fullName.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        (u.registrationNumber && u.registrationNumber.toLowerCase().includes(term)) ||
        (u.role && u.role.toLowerCase().includes(term));

      // Normalize roles for comparison
      const userRole = String(u.role ?? '').toUpperCase();

      let matchesRole = true;
      if (filterRole === 'STAFF') {
        matchesRole = userRole !== 'STUDENT';
      } else if (filterRole) {
        matchesRole = userRole === filterRole || String(this.authService.mapRole(u.role)).toUpperCase() === filterRole;
      }

      const matchesStatus = !statusFilter ||
        (statusFilter === 'active' ? u.isActive !== false : u.isActive === false);

      let matchesAward = true;
      if (this.userAwardFilter === 'POSTGRADUATE') {
        matchesAward = userRole === 'STUDENT' && this.isPostgraduateUser(u);
      } else if (this.userAwardFilter === 'UNDERGRADUATE') {
        matchesAward = userRole === 'STUDENT' && !this.isPostgraduateUser(u);
      } else if (this.userAwardFilter) {
        const uAward = (u.award || '').toLowerCase();
        const fAward = this.userAwardFilter.toLowerCase();
        matchesAward = uAward.includes(fAward) || (u.programme && u.programme.toLowerCase().includes(fAward));
      }

      return matchesSearch && matchesRole && matchesStatus && matchesAward;
    });

    this.totalPages = Math.max(1, Math.ceil(this.filteredUsers.length / this.pageSize));
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedUsers = this.filteredUsers.slice(start, start + this.pageSize);
  }

  onUserFilterChange(): void {
    this.currentPage = 1;
    this.applyUserFiltersAndPagination();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.applyUserFiltersAndPagination();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.applyUserFiltersAndPagination();
    }
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) {
      this.currentPage = p;
      this.applyUserFiltersAndPagination();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.applyUserFiltersAndPagination();
  }

  clearUserFilters(): void {
    this.userSearchTerm = '';
    this.userRoleFilter = '';
    this.userStatusFilter = '';
    this.userAwardFilter = '';
    this.currentPage = 1;
    this.applyUserFiltersAndPagination();
  }

  isPostgraduateUser(u: any): boolean {
    return isPostgraduateEntity(u);
  }

  isStudent(u: any): boolean {
    return String(u?.role ?? '').toUpperCase() === 'STUDENT';
  }

  getStudentAwardCategory(u: any): { label: string; type: 'postgraduate' | 'undergraduate'; isPostgrad: boolean; badgeClass: string; icon: string } {
    if (!u) return { label: 'Unknown', type: 'undergraduate', isPostgrad: false, badgeClass: 'award-badge-bachelor', icon: 'bi-mortarboard' };
    const isPostgrad = this.isPostgraduateUser(u);
    const award = (u.award || '').trim();
    const prog = (u.programme || '').toLowerCase();

    if (award) {
      const lower = award.toLowerCase();
      if (lower.includes('phd') || lower.includes('doctor')) {
        return { label: award, type: 'postgraduate', isPostgrad: true, badgeClass: 'award-badge-phd', icon: 'bi-mortarboard-fill' };
      }
      if (lower.includes('master')) {
        return { label: award, type: 'postgraduate', isPostgrad: true, badgeClass: 'award-badge-masters', icon: 'bi-mortarboard-fill' };
      }
      if (lower.includes('postgraduate')) {
        return { label: award, type: 'postgraduate', isPostgrad: true, badgeClass: 'award-badge-pgd', icon: 'bi-mortarboard-fill' };
      }
      if (lower.includes('bachelor') || lower.includes('degree')) {
        return { label: award, type: 'undergraduate', isPostgrad: false, badgeClass: 'award-badge-bachelor', icon: 'bi-mortarboard' };
      }
      if (lower.includes('diploma')) {
        return { label: award, type: 'undergraduate', isPostgrad: false, badgeClass: 'award-badge-diploma', icon: 'bi-award' };
      }
      if (lower.includes('certificate')) {
        return { label: award, type: 'undergraduate', isPostgrad: false, badgeClass: 'award-badge-certificate', icon: 'bi-patch-check' };
      }
      return { label: award, type: isPostgrad ? 'postgraduate' : 'undergraduate', isPostgrad, badgeClass: isPostgrad ? 'award-badge-masters' : 'award-badge-bachelor', icon: 'bi-mortarboard' };
    }

    if (prog.includes('phd') || prog.includes('doctor')) {
      return { label: 'PhD', type: 'postgraduate', isPostgrad: true, badgeClass: 'award-badge-phd', icon: 'bi-mortarboard-fill' };
    }
    if (prog.includes('master') || prog.includes('msc') || prog.includes('mba')) {
      return { label: 'Master Degree', type: 'postgraduate', isPostgrad: true, badgeClass: 'award-badge-masters', icon: 'bi-mortarboard-fill' };
    }
    if (prog.includes('postgraduate') || prog.includes('pgd')) {
      return { label: 'Postgraduate Diploma', type: 'postgraduate', isPostgrad: true, badgeClass: 'award-badge-pgd', icon: 'bi-mortarboard-fill' };
    }
    if (prog.includes('diploma')) {
      return { label: 'Diploma', type: 'undergraduate', isPostgrad: false, badgeClass: 'award-badge-diploma', icon: 'bi-award' };
    }
    if (prog.includes('certificate')) {
      return { label: 'Certificate', type: 'undergraduate', isPostgrad: false, badgeClass: 'award-badge-certificate', icon: 'bi-patch-check' };
    }

    return { label: isPostgrad ? 'Postgraduate' : 'Bachelor Degree', type: isPostgrad ? 'postgraduate' : 'undergraduate', isPostgrad, badgeClass: isPostgrad ? 'award-badge-masters' : 'award-badge-bachelor', icon: 'bi-mortarboard' };
  }

  filterByAwardCategory(cat: string): void {
    this.userRoleFilter = 'Student';
    this.userAwardFilter = cat;
    this.currentPage = 1;
    this.applyUserFiltersAndPagination();
  }

  filterByStaff(): void {
    this.userRoleFilter = 'STAFF';
    this.userAwardFilter = '';
    this.currentPage = 1;
    this.applyUserFiltersAndPagination();
  }

  trackByUserId(index: number, user: any): string {
    return user?.id || index.toString();
  }

  // Pagination & Filtering State for Clearance Requests Table
  currentRequestPage: number = 1;
  requestPageSize: number = 25;
  filteredRequests: any[] = [];
  paginatedRequests: any[] = [];
  totalRequestPages: number = 1;

  applyRequestFiltersAndPagination(): void {
    const term = (this.requestSearchTerm || '').trim().toLowerCase();
    const statusFilter = this.requestStatusFilter;

    this.filteredRequests = this.clearanceRequests.filter(r => {
      const normalizedStatus = String(r.status || 'PENDING').toUpperCase();
      if (statusFilter === 'COMPLETED') {
        if (!['COMPLETED', 'APPROVED', 'CLEARED'].includes(normalizedStatus)) return false;
      } else if (statusFilter && normalizedStatus !== statusFilter) {
        return false;
      }

      if (!term) return true;
      const name = (r.student?.fullName || r.studentName || '').toLowerCase();
      const reg = (r.student?.registrationNumber || r.registrationNumber || '').toLowerCase();
      const college = (r.college || r.student?.college || '').toLowerCase();
      const dept = (r.department || r.student?.department || '').toLowerCase();
      const status = normalizedStatus.toLowerCase();
      const stage = (r.currentStage || '').toLowerCase();
      return name.includes(term) || reg.includes(term) || college.includes(term) || dept.includes(term) || status.includes(term) || stage.includes(term);
    });

    this.totalRequestPages = Math.max(1, Math.ceil(this.filteredRequests.length / this.requestPageSize));
    if (this.currentRequestPage > this.totalRequestPages) {
      this.currentRequestPage = this.totalRequestPages;
    }
    if (this.currentRequestPage < 1) {
      this.currentRequestPage = 1;
    }

    const start = (this.currentRequestPage - 1) * this.requestPageSize;
    this.paginatedRequests = this.filteredRequests.slice(start, start + this.requestPageSize);
  }

  onRequestFilterChange(): void {
    this.currentRequestPage = 1;
    this.applyRequestFiltersAndPagination();
  }

  nextRequestPage(): void {
    if (this.currentRequestPage < this.totalRequestPages) {
      this.currentRequestPage++;
      this.applyRequestFiltersAndPagination();
    }
  }

  prevRequestPage(): void {
    if (this.currentRequestPage > 1) {
      this.currentRequestPage--;
      this.applyRequestFiltersAndPagination();
    }
  }

  goToRequestPage(p: number): void {
    if (p >= 1 && p <= this.totalRequestPages) {
      this.currentRequestPage = p;
      this.applyRequestFiltersAndPagination();
    }
  }

  onRequestPageSizeChange(): void {
    this.currentRequestPage = 1;
    this.applyRequestFiltersAndPagination();
  }

  trackByRequestId(index: number, req: any): string {
    return req?.id || index.toString();
  }

  ngOnInit(): void {
    const token = this.authService.getToken();
    if (!token) {
      console.warn('No token found. Redirecting to login.');
      this.logout();
      return;
    }

    this.unreadSub = this.notificationService.unreadCount$.subscribe(count => {
      this.unreadNotifications = count;
    });
    this.notificationService.refreshUnreadCount().subscribe();

    const initialTab = this.route.snapshot.queryParamMap.get('tab');
    if (initialTab && ['users', 'clearance', 'upload', 'dashboards', 'theme', 'awards', 'sponsors'].includes(initialTab)) {
      this.setTab(initialTab as any);
      if (['upload', 'dashboards', 'theme', 'awards', 'sponsors'].includes(initialTab)) {
        this.institutionalMenuOpen = true;
      }
    }

    this.loadData();
    this.loadProjectConfig();
    this.loadAwards();
  }

  ngOnDestroy(): void {
    this.unreadSub?.unsubscribe();
  }

  isLoadingUsers: boolean = false;

  reloadUsersFast(): void {
    this.isLoadingUsers = true;
    this.adminService.getAllUsers().subscribe({
      next: (users) => {
        this.isLoadingUsers = false;
        if (Array.isArray(users)) {
          this.users = users.map(u => this.authService.mapUserResponse(u));
        } else {
          this.users = [];
        }
        this.calculateStats();
        this.applyUserFiltersAndPagination();
        this.changeDetector.detectChanges();
      },
      error: (err) => {
        this.isLoadingUsers = false;
        console.error('Error reloading users fast:', err);
        this.changeDetector.detectChanges();
      }
    });
  }

  loadData(): void {
    this.isLoadingUsers = true;
    this.adminService.getAllUsers().subscribe({
      next: (users) => {
        this.isLoadingUsers = false;
        if (Array.isArray(users)) {
          this.users = users.map(u => this.authService.mapUserResponse(u));
          console.log(`📦 Admin loaded ${this.users.length} users`);
        } else {
          console.error('📦 Admin users data is not an array:', users);
          this.users = [];
        }
        this.calculateStats();
        this.applyUserFiltersAndPagination();
        this.changeDetector.detectChanges();
      },
      error: (err) => {
        this.isLoadingUsers = false;
        console.error('Error loading users', err);
        this.message = 'Failed to load users. Please check backend connection.';
        this.isError = true;
        this.users = [];
        this.calculateStats();
        this.applyUserFiltersAndPagination();
      }
    });

    this.adminService.getAllRoles().subscribe({
      next: (roles) => {
        // Map raw enum strings to user-friendly roles and ensure uniqueness
        const mappedRoles = roles.map(r => this.authService.mapRole(r));
        this.roles = Array.from(new Set([...this.roles, ...mappedRoles])).sort();
        console.log('📦 Admin unique roles:', this.roles);
      },
      error: (err) => console.error('Error loading roles', err)
    });

    this.adminService.getAllClearanceRequests().subscribe({
      next: (requests) => {
        this.clearanceRequests = Array.isArray(requests) ? requests : [];
        this.calculateStats();
        this.applyRequestFiltersAndPagination();
      },
      error: (err) => {
        console.error('Failed to load clearance requests from backend:', err);
        this.clearanceRequests = [];
        if (!this.message) {
          this.message = err?.error?.message || 'Failed to load clearance requests from the server.';
          this.isError = true;
        }
        this.calculateStats();
        this.applyRequestFiltersAndPagination();
      }
    });

    this.notificationService.refreshUnreadCount().subscribe();
  }

  calculateStats(): void {
    const students = this.users.filter(u => String(u.role ?? '').toUpperCase() === 'STUDENT');
    this.stats.totalStudents = students.length;
    this.stats.totalPostgraduates = students.filter(s => this.isPostgraduateUser(s)).length;
    this.stats.totalUndergraduates = this.stats.totalStudents - this.stats.totalPostgraduates;
    this.stats.totalStaff = this.users.filter(u => String(u.role ?? '').toUpperCase() !== 'STUDENT').length;
    this.stats.pendingUsers = this.users.filter(u => u.isActive === false).length;
    this.stats.totalRequests = this.clearanceRequests.length;
    this.stats.completed = this.clearanceRequests.filter(r => ['COMPLETED', 'APPROVED', 'CLEARED'].includes(String(r.status ?? '').toUpperCase())).length;
    this.stats.pending = this.clearanceRequests.filter(r => String(r.status ?? '').toUpperCase() === 'PENDING').length;
    this.stats.rejected = this.clearanceRequests.filter(r => String(r.status ?? '').toUpperCase() === 'REJECTED').length;
    this.changeDetector.markForCheck();
  }

  private readonly defaultProjectDashboards: ProjectDashboard[] = [
    { id: 'academic-staff', name: 'Academic Staff', description: 'Academic Staff clearance office', enabled: true },
    { id: 'administrator', name: 'Administrator', description: 'Administrator clearance office', enabled: true },
    { id: 'daruso', name: 'DARUSO', description: 'DARUSO clearance office', enabled: true },
    { id: 'dean-of-students', name: 'Dean of Students', description: 'Dean of Students clearance office', enabled: true },
    { id: 'department', name: 'Department', description: 'Department clearance office', enabled: true },
    { id: 'finance', name: 'Finance', description: 'Finance clearance office', enabled: true },
    { id: 'games-coach', name: 'Games Coach', description: 'Games Coach clearance office', enabled: true },
    { id: 'hall-warden', name: 'Hall Warden', description: 'Hall Warden clearance office', enabled: true },
    { id: 'laboratory', name: 'Laboratory', description: 'Laboratory clearance office', enabled: true },
    { id: 'library', name: 'Library', description: 'Library clearance office', enabled: true },
    { id: 'principal', name: 'Principal', description: 'Principal clearance office', enabled: true },
    { id: 'smart-card', name: 'Smart Card', description: 'Smart Card clearance office', enabled: true },
    { id: 'usab', name: 'USAB', description: 'USAB clearance office', enabled: true },
    { id: 'workshop', name: 'Workshop', description: 'Workshop clearance office', enabled: true }
  ];

  loadProjectConfig(): void {
    this.projectAdminService.getProjectConfig().subscribe({
      next: (config) => {
        if (config && config.branding && !config.branding.footerLinks) {
          config.branding.footerLinks = [];
        }
        if (config?.branding) {
          config.branding.primaryColor = normalizeUdsmBrandColor(config.branding.primaryColor);
        }
        if (config && (!config.dashboards || config.dashboards.length === 0)) {
          config.dashboards = this.loadLocalDashboards();
        }
        this.projectConfig = config;
        this.saveLocalDashboards(config.dashboards || []);
      },
      error: (err) => {
        console.warn('Backend project config fetch failed, using local dashboards:', err);
        const savedBranding = this.projectAdminService.getSavedBranding() || {
          universityName: 'University of Dar es Salaam',
          shortName: 'UDSM',
          logoUrl: '/udsm-logo.png',
          backgroundUrl: '',
          primaryColor: DEFAULT_UDSM_BRAND_COLOR,
          fontFamily: 'Segoe UI',
          footerLinks: []
        };
        this.projectConfig = {
          projectId: 'udsm-main',
          branding: savedBranding as any,
          dashboards: this.loadLocalDashboards()
        };
      }
    });
  }

  private loadLocalDashboards(): ProjectDashboard[] {
    const raw = localStorage.getItem('udsm-project-dashboards');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    localStorage.setItem('udsm-project-dashboards', JSON.stringify(this.defaultProjectDashboards));
    return [...this.defaultProjectDashboards];
  }

  private saveLocalDashboards(dashboards: ProjectDashboard[]): void {
    localStorage.setItem('udsm-project-dashboards', JSON.stringify(dashboards));
  }

  setTab(tab: 'users' | 'clearance' | 'upload' | 'dashboards' | 'theme' | 'awards' | 'sponsors'): void {
    this.activeTab = tab;
    this.closeSidebar();
    this.message = '';
    if (tab === 'users') {
      this.applyUserFiltersAndPagination();
    } else if (tab === 'clearance') {
      this.applyRequestFiltersAndPagination();
    } else if (tab === 'sponsors') {
      this.loadSponsors();
    }
  }

  navigateToStudents(): void {
    this.userSearchTerm = '';
    this.userRoleFilter = 'Student';
    this.userStatusFilter = '';
    this.setTab('users');
  }

  navigateToStaff(): void {
    this.userSearchTerm = '';
    this.userRoleFilter = 'STAFF';
    this.userStatusFilter = '';
    this.setTab('users');
  }

  navigateToClearanceRequests(statusFilter?: '' | 'COMPLETED' | 'PENDING' | 'REJECTED'): void {
    this.requestSearchTerm = '';
    this.requestStatusFilter = statusFilter || '';
    this.currentRequestPage = 1;
    this.setTab('clearance');
  }

  navigateToPendingActivation(): void {
    this.userSearchTerm = '';
    this.userRoleFilter = '';
    this.userStatusFilter = 'inactive';
    this.setTab('users');
  }

  loadAwards(): void {
    this.awardsList = this.awardService.getAwards();
  }

  addAward(): void {
    const trimmed = this.newAwardName.trim();
    if (!trimmed) {
      this.message = 'Please enter an award name.';
      this.isError = true;
      return;
    }

    if (this.awardService.addAward(trimmed)) {
      this.message = `Award "${trimmed}" added successfully.`;
      this.isError = false;
      this.newAwardName = '';
      this.loadAwards();
    } else {
      this.message = `Award "${trimmed}" already exists or could not be added.`;
      this.isError = true;
    }
  }

  startEditAward(award: string): void {
    this.editingAwardName = award;
    this.editedAwardName = award;
  }

  cancelEditAward(): void {
    this.editingAwardName = null;
    this.editedAwardName = '';
  }

  saveAwardEdit(): void {
    const currentName = this.editingAwardName;
    const updatedName = this.editedAwardName.trim();
    if (!currentName || !updatedName) {
      this.message = 'Please enter an award name.';
      this.isError = true;
      return;
    }

    if (this.awardService.updateAward(currentName, updatedName)) {
      this.message = `Award "${currentName}" updated successfully.`;
      this.isError = false;
      this.cancelEditAward();
      this.loadAwards();
    } else {
      this.message = `Award "${updatedName}" already exists or could not be updated.`;
      this.isError = true;
    }
  }

  deleteAward(award: string): void {
    if (confirm(`Are you sure you want to delete the award "${award}"?`)) {
      if (this.awardService.deleteAward(award)) {
        this.message = `Award "${award}" deleted successfully.`;
        this.isError = false;
        this.loadAwards();
      } else {
        this.message = `Failed to delete award "${award}".`;
        this.isError = true;
      }
    }
  }

  resetAwards(): void {
    if (confirm('Reset awards list to defaults?')) {
      this.awardsList = this.awardService.resetToDefaults();
      this.message = 'Awards reset to default options.';
      this.isError = false;
    }
  }

  // ==========================================
  // SPONSOR & FUNDING MANAGEMENT
  // ==========================================

  loadSponsors(): void {
    this.sponsorService.getAllSponsors().subscribe({
      next: (list) => {
        this.sponsorsList = list || [];
        this.applySponsorFilter();
      },
      error: (err) => {
        console.error('Failed to load sponsors:', err);
        this.sponsorsList = [];
        this.applySponsorFilter();
      }
    });
  }

  applySponsorFilter(): void {
    const term = (this.sponsorSearchTerm || '').trim().toLowerCase();
    if (!term) {
      this.filteredSponsors = [...this.sponsorsList];
    } else {
      this.filteredSponsors = this.sponsorsList.filter(s =>
        s.name.toLowerCase().includes(term) ||
        (s.code && s.code.toLowerCase().includes(term)) ||
        (s.description && s.description.toLowerCase().includes(term))
      );
    }
  }

  addSponsor(): void {
    if (this.isSavingSponsor) return;
    const name = this.newSponsorName.trim();
    if (!name) {
      this.message = 'Please enter a sponsor name.';
      this.isError = true;
      return;
    }

    this.isSavingSponsor = true;
    const payload: Partial<Sponsor> = {
      name,
      code: this.newSponsorCode.trim() || undefined,
      description: this.newSponsorDescription.trim() || undefined,
      isActive: true
    };

    this.sponsorService.createSponsor(payload).subscribe({
      next: (created) => {
        this.isSavingSponsor = false;
        this.message = `Sponsor "${created.name}" added successfully.`;
        this.isError = false;
        this.newSponsorName = '';
        this.newSponsorCode = '';
        this.newSponsorDescription = '';
        this.loadSponsors();
      },
      error: (err) => {
        this.isSavingSponsor = false;
        console.error('Failed to add sponsor:', err);
        this.message = err.error?.message || `Sponsor "${name}" already exists or could not be added.`;
        this.isError = true;
      }
    });
  }

  startEditSponsor(s: Sponsor): void {
    this.editingSponsorId = s.id || s.name;
    this.editedSponsorName = s.name;
    this.editedSponsorCode = s.code || '';
    this.editedSponsorDescription = s.description || '';
  }

  cancelEditSponsor(): void {
    this.editingSponsorId = null;
    this.editedSponsorName = '';
    this.editedSponsorCode = '';
    this.editedSponsorDescription = '';
  }

  saveSponsorEdit(): void {
    if (!this.editingSponsorId || this.isSavingSponsor) return;
    const name = this.editedSponsorName.trim();
    if (!name) {
      this.message = 'Sponsor name cannot be empty.';
      this.isError = true;
      return;
    }

    const sponsor = this.sponsorsList.find(s => (s.id || s.name) === this.editingSponsorId);
    if (!sponsor || !sponsor.id) {
      this.cancelEditSponsor();
      return;
    }

    this.isSavingSponsor = true;
    this.sponsorService.updateSponsor(sponsor.id, {
      name,
      code: this.editedSponsorCode.trim() || undefined,
      description: this.editedSponsorDescription.trim() || undefined
    }).subscribe({
      next: (updated) => {
        this.isSavingSponsor = false;
        this.message = `Sponsor "${updated.name}" updated successfully.`;
        this.isError = false;
        this.cancelEditSponsor();
        this.loadSponsors();
      },
      error: (err) => {
        this.isSavingSponsor = false;
        console.error('Failed to update sponsor:', err);
        this.message = err?.error?.message || 'Failed to update sponsor.';
        this.isError = true;
      }
    });
  }

  toggleSponsorActive(s: Sponsor): void {
    if (!s.id) return;
    const newStatus = s.isActive === false ? true : false;
    this.sponsorService.updateSponsor(s.id, { isActive: newStatus }).subscribe({
      next: () => {
        s.isActive = newStatus;
        this.message = `Sponsor "${s.name}" is now ${newStatus ? 'Active' : 'Inactive'}.`;
        this.isError = false;
      },
      error: (err) => {
        console.error('Failed to toggle sponsor status:', err);
        this.message = 'Could not update sponsor status.';
        this.isError = true;
      }
    });
  }

  deleteSponsor(s: Sponsor): void {
    if (!confirm(`Are you sure you want to remove "${s.name}"?`)) return;
    if (!s.id) return;
    this.sponsorService.deleteSponsor(s.id).subscribe({
      next: () => {
        this.message = `Sponsor "${s.name}" removed successfully.`;
        this.isError = false;
        this.loadSponsors();
      },
      error: (err) => {
        console.error('Failed to delete sponsor:', err);
        this.message = 'Could not remove sponsor.';
        this.isError = true;
      }
    });
  }

  addDashboard(): void {
    if (this.isSavingDashboard) return;
    if (!this.newDashboard.id.trim() || !this.newDashboard.name.trim()) {
      this.message = 'Dashboard ID and Name are required.';
      this.isError = true;
      return;
    }

    const newDash: ProjectDashboard = {
      id: this.newDashboard.id.trim(),
      name: this.newDashboard.name.trim(),
      description: this.newDashboard.description.trim(),
      enabled: true
    };

    this.isSavingDashboard = true;
    this.projectAdminService.createDashboard(newDash).subscribe({
      next: () => {
        this.isSavingDashboard = false;
        this.message = 'Dashboard added successfully.';
        this.isError = false;
        this.newDashboard = { id: '', name: '', description: '' };
        this.loadProjectConfig();
      },
      error: (err) => {
        this.isSavingDashboard = false;
        this.message = err?.error?.message || `Failed to save dashboard "${newDash.name}" to the server.`;
        this.isError = true;
      }
    });
  }

  updateDashboard(dashboard: ProjectDashboard): void {
    if (this.isSavingDashboard) return;
    this.isSavingDashboard = true;
    this.projectAdminService.updateDashboard(dashboard).subscribe({
      next: () => {
        this.isSavingDashboard = false;
        this.message = 'Dashboard updated successfully.';
        this.isError = false;
        if (this.projectConfig?.dashboards) {
          this.saveLocalDashboards(this.projectConfig.dashboards);
        }
      },
      error: (err) => {
        this.isSavingDashboard = false;
        this.message = err?.error?.message || `Failed to update dashboard "${dashboard.name}" on the server.`;
        this.isError = true;
      }
    });
  }

  deleteDashboard(id: string): void {
    if (this.isSavingDashboard) return;
    if (!confirm('Delete this dashboard from your project?')) return;
    this.isSavingDashboard = true;
    this.projectAdminService.deleteDashboard(id).subscribe({
      next: () => {
        this.isSavingDashboard = false;
        this.message = 'Dashboard deleted successfully.';
        this.isError = false;
        this.loadProjectConfig();
      },
      error: (err) => {
        this.isSavingDashboard = false;
        this.message = err?.error?.message || 'Failed to delete dashboard on the server.';
        this.isError = true;
      }
    });
  }

  saveTheme(): void {
    if (!this.projectConfig || this.isSavingTheme) return;
    this.isSavingTheme = true;
    const submittedBranding = {
      ...this.projectConfig.branding,
      primaryColor: normalizeUdsmBrandColor(this.projectConfig.branding.primaryColor)
    };
    this.projectConfig.branding.primaryColor = submittedBranding.primaryColor;
    this.projectAdminService.updateBranding(submittedBranding).subscribe({
      next: (branding) => {
        this.isSavingTheme = false;
        const savedBranding = {
          ...submittedBranding,
          ...branding,
          // Keep the exact strings entered in the theme form even if the API response
          // applies a different representation for display.
          logoUrl: submittedBranding.logoUrl,
          backgroundUrl: submittedBranding.backgroundUrl,
          primaryColor: normalizeUdsmBrandColor(branding.primaryColor ?? submittedBranding.primaryColor)
        };
        this.projectConfig = this.projectConfig ? { ...this.projectConfig, branding: savedBranding } : { projectId: '', branding: savedBranding, dashboards: [] };
        this.projectAdminService.setSavedBranding(savedBranding);
        window.dispatchEvent(new CustomEvent('project-branding-updated', { detail: { branding: savedBranding } }));
        this.message = 'Project theme saved';
        this.isError = false;
      },
      error: (err) => {
        this.isSavingTheme = false;
        this.message = err?.error?.message || 'Failed to save project theme';
        this.isError = true;
      }
    });
  }

  previewLogo(logoUrl: string): void {
    const normalizedLogoUrl = normalizeBrandAssetUrl(logoUrl, '/udsm-logo.png');
    window.dispatchEvent(new CustomEvent('project-branding-updated', {
      detail: { branding: { logoUrl: normalizedLogoUrl } }
    }));
  }

  get selectedThemeColor() {
    const selectedHex = normalizeUdsmBrandColor(this.projectConfig?.branding.primaryColor);
    return this.themeColors.find(color => color.hex === selectedHex) ?? this.themeColors[0];
  }

  toggleThemeColorDropdown(): void {
    this.themeColorDropdownOpen = !this.themeColorDropdownOpen;
  }

  selectThemeColor(colorHex: string): void {
    if (!this.projectConfig) return;
    this.projectConfig.branding.primaryColor = normalizeUdsmBrandColor(colorHex);
    this.themeColorDropdownOpen = false;
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

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !img.dataset['fallback']) {
      img.dataset['fallback'] = '1';
      img.src = '/udsm-logo.jpg';
    } else if (img && img.dataset['fallback'] === '1') {
      img.dataset['fallback'] = '2';
      img.src = 'assets/udsm-logo.png';
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  addUser(): void {
    if (this.isSubmittingUser) return;
    this.isSubmittingUser = true;
    const payload = { ...this.newUser };

    // For staff, if registrationNumber / staff ID is omitted, generate a clean unique staff ID
    if (!this.isStudentRole && (!payload.registrationNumber || !payload.registrationNumber.trim())) {
      const rolePrefix = (payload.role || 'STF').replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      payload.registrationNumber = `STF-${rolePrefix}-${randomSuffix}`;
    }

    // Clean up fields based on role
    if (this.isCentralOfficeRole) {
      payload.college = '';
      payload.programme = '';
      if (!payload.department) {
        payload.department = this.getDefaultDepartmentForRole(payload.role);
      }
    } else if (this.isPrincipalRole) {
      payload.department = '';
      payload.programme = '';
    } else if (this.isDepartmentalStaffRole) {
      payload.programme = '';
    } else if (this.isStudentRole) {
      payload.award = this.newUser.award || 'Bachelor Degree';
      payload.isPostgraduate = this.newUser.isPostgraduate || isPostgraduateAward(payload.award);
    }

    this.adminService.createUser(payload).subscribe({
      next: (res) => {
        this.isSubmittingUser = false;
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
        this.isSubmittingUser = false;
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
      role: 'Student',
      college: '',
      department: '',
      programme: '',
      faculty: '',
      yearOfStudy: '',
      award: 'Bachelor Degree',
      isPostgraduate: false
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
    const user = this.users.find(u => u.id === userId);
    const userName = user ? (user.fullName || user.username || user.email) : 'User #' + userId;
    const confirmChange = confirm(
      `⚠️ Role Change Attention\n\nAre you sure you want to change the role for ${userName} to "${newRole}"?`
    );
    if (!confirmChange) {
      this.loadData();
      return;
    }

    this.adminService.updateUserRole(userId, newRole).subscribe({
      next: () => {
        this.message = `Role updated successfully to "${newRole}" for ${userName}`;
        this.isError = false;
        this.loadData();
      },
      error: (err) => {
        this.message = 'Failed to update role';
        this.isError = true;
        this.loadData();
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
    const file = event.target.files[0];
    if (!file) {
      this.selectedFile = null;
      return;
    }

    if (file.size > this.maxFileUploadSizeBytes) {
      this.message = `Selected file "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum 10MB size limit. Please upload a smaller file.`;
      this.isError = true;
      this.selectedFile = null;
      event.target.value = '';
      return;
    }

    this.selectedFile = file;
    this.message = `Selected file "${file.name}" (${(file.size / 1024).toFixed(1)} KB). Ready for processing.`;
    this.isError = false;
  }

  uploadCategory: 'STUDENT' | 'STAFF' = 'STUDENT';
  isUploading: boolean = false;

  uploadFile(): void {
    if (!this.selectedFile) return;

    if (this.selectedFile.size > this.maxFileUploadSizeBytes) {
      this.message = 'Selected file exceeds the maximum 10MB size limit.';
      this.isError = true;
      return;
    }

    this.isUploading = true;
    this.message = `Uploading and processing ${this.uploadCategory === 'STAFF' ? 'staff members' : 'students'} records...`;
    this.isError = false;

    this.adminService.bulkUploadUsers(this.selectedFile, this.uploadCategory).subscribe({
      next: (res) => {
        this.isUploading = false;
        this.message = res.message || `${this.uploadCategory === 'STAFF' ? 'Staff members' : 'Students'} successfully uploaded and processed!`;
        this.isError = false;
        this.selectedFile = null;
        if (this.bulkUploadInput?.nativeElement) {
          this.bulkUploadInput.nativeElement.value = '';
        }

        // Immediate reload & auto-switch to User Management view
        this.loadData();
        this.setTab('users');
      },
      error: (err) => {
        this.isUploading = false;
        this.message = 'Upload failed: ' + (err.error?.message || err.message || 'Unknown error');
        this.isError = true;
      }
    });
  }

  downloadSampleCsv(): void {
    const isStaff = this.uploadCategory === 'STAFF';
    const headers = isStaff
      ? 'First Name,Middle Name,Last Name,Email,Role,Staff ID (PF Number),Password,College,Department,Phone\r\n'
      : 'First Name,Middle Name,Last Name,Email,Role,Registration Number,Password,College,Department,Programme,Award,Phone\r\n';
    const filename = isStaff ? 'staff_registration_template.csv' : 'clearance_registration_template.csv';
    const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  downloadSampleExcel(): void {
    const isStaff = this.uploadCategory === 'STAFF';
    const filename = isStaff ? 'staff_registration_template.xlsx' : 'clearance_registration_template.xlsx';
    const link = document.createElement('a');
    link.href = '/' + filename + '?t=' + Date.now();
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
