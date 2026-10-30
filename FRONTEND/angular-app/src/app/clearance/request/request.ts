// clearance-request.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { ClearanceService } from '../../core/services/clearance.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';
import { TranscriptPaymentService } from '../../core/services/transcript-payment.service';
import { firstValueFrom } from 'rxjs';

interface DepartmentData {
  [department: string]: string[];
}

interface AcademicUnitData {
  [college: string]: DepartmentData;
}

@Component({
  selector: 'app-clearance-request',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    RouterLinkActive,
    DashboardHeaderComponent
  ],
  templateUrl: './request.html',
  styleUrl: './request.css'
})
export class ClearanceRequestComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly clearanceService = inject(ClearanceService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly transcriptService = inject(TranscriptPaymentService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  sidebarOpen = false;
  // =====================================================
  // CLEARANCE FORM
  // =====================================================

  requestForm = this.fb.nonNullable.group({
    studentName: ['', Validators.required],
    registrationNumber: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9+--\s()]{8,20}$/)]],
    physicalAddress: ['', Validators.required],
    college: ['', Validators.required],
    department: ['', Validators.required],
    programme: ['', Validators.required],
    residenceType: ['', Validators.required],
    hostelHall: [''],
    wing: [''],
    block: [''],
    roomNumber: [''],
    residenceEvidence: [''],
    sponsor: ['', Validators.required],
    photo: [''],
    confirm: [false, Validators.requiredTrue]
  });

  photoPreview: string | null = null;
  isSubmitting = false;
  hasSubmittedRequest = false;

  // =====================================================
  // UDSM COLLEGE → DEPARTMENT → PROGRAMME
  // =====================================================

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

  // =====================================================
  // COLLEGE OPTIONS
  // =====================================================

  get collegeList(): string[] {
    return Object.keys(this.academicUnits);
  }

  // =====================================================
  // DEPARTMENT OPTIONS
  // =====================================================

  get departments(): string[] {
    const college = this.requestForm.controls.college.value;
    if (!college) return [];
    return Object.keys(this.academicUnits[college] || {});
  }

  // =====================================================
  // PROGRAMME OPTIONS
  // =====================================================

  get programmeOptions(): string[] {
    const college = this.requestForm.controls.college.value;
    const department = this.requestForm.controls.department.value;
    if (!college || !department) return [];
    return this.academicUnits[college]?.[department] || [];
  }

  // =====================================================
  // RESIDENCE & SPONSOR DROPDOWN OPTIONS
  // =====================================================

  readonly residenceOptions = [
    'Hostel Dwellers',
    'Non-Hostel Dwellers'
  ];

  readonly hallOptions = [
    'CoICT Hostels',
    'Kunduchi Hostels',
    'Mabibo Hostels',
    'Magufuli Hostels',
    'Mikocheni Hostels'
  ];

  readonly coictWings = [
    'Wing A',
    'Wing B'
  ];

  readonly blockOptions = [
    'Block A',
    'Block B',
    'Block C',
    'Block D',
    'Block E',
    'Block F'
  ];

  readonly sponsorOptions = [
    'HELBS',
    'Karimjee Scholarships',
    'MO scholarship',
    'PRIVATE'
  ];

  get isHostelDweller(): boolean {
    return this.requestForm.controls.residenceType.value === 'Hostel Dwellers';
  }

  get isCoictHostel(): boolean {
    return this.isHostelDweller && this.requestForm.controls.hostelHall.value === 'CoICT Hostels';
  }

  get isBlockHostel(): boolean {
    const hall = this.requestForm.controls.hostelHall.value;
    return this.isHostelDweller && (hall === 'Mabibo Hostels' || hall === 'Magufuli Hostels');
  }

  get currentUser() {
    return this.authService.getCurrentUser();
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

  get isTranscriptPaid(): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    const requests = this.transcriptService.getStudentRequests(user.id);
    return requests.some(r => r.attemptNumber === 1 && r.status === 'Paid');
  }

  // =====================================================
  // LOAD STUDENT INFORMATION ON INIT
  // =====================================================

  ngOnInit(): void {
    this.loadStudentData();

    if (this.hasExistingRequest()) {
      this.loadExistingRequest();

      if (this.revisionRequest) {
        this.hasSubmittedRequest = false;
      } else {
        this.hasSubmittedRequest = true;
        this.toastService.info('Already Submitted', 'You have already submitted a clearance request.');
        this.requestForm.disable();
      }
    }
  }

  private hasExistingRequest(): boolean {
    const user = this.authService.getCurrentUser();
    return !!user && this.clearanceService.getStudentRequests(user.id).length > 0;
  }

  get revisionRequest() {
    const user = this.authService.getCurrentUser();
    return user
      ? this.clearanceService.getStudentRequests(user.id).at(-1)?.status === 'Rejected'
        ? this.clearanceService.getStudentRequests(user.id).at(-1)
        : null
      : null;
  }

  get revisionReason(): string {
    const request = this.revisionRequest;
    if (!request || !request.revisionOffice) return '';
    return request.approvals.find(approval => approval.office === request.revisionOffice)?.comment || '';
  }

  findMatchingCollege(cName: string): string {
    if (!cName) return '';
    const trimmed = cName.trim();
    const direct = this.collegeList.find(c => c.toLowerCase() === trimmed.toLowerCase());
    if (direct) return direct;
    const abbr = this.collegeList.find(c => {
      const lower = c.toLowerCase();
      const target = trimmed.toLowerCase();
      return lower.includes(`(${target})`) || target.includes(`(${lower})`) || lower.includes(target) || target.includes(lower);
    });
    if (abbr) return abbr;
    return trimmed;
  }

  findMatchingDepartment(collegeKey: string, dName: string): string {
    if (!dName) return '';
    if (!collegeKey) return dName.trim();
    const depts = Object.keys(this.academicUnits[collegeKey] || {});
    const trimmed = dName.trim().toLowerCase();
    const direct = depts.find(d => d.toLowerCase() === trimmed);
    if (direct) return direct;
    const partial = depts.find(d => d.toLowerCase().includes(trimmed) || trimmed.includes(d.toLowerCase()));
    if (partial) return partial;
    return dName.trim();
  }

  findMatchingProgramme(collegeKey: string, deptKey: string, pName: string): string {
    if (!pName) return '';
    const progs = this.academicUnits[collegeKey]?.[deptKey] || [];
    const trimmed = pName.trim().toLowerCase();
    const direct = progs.find(p => p.toLowerCase() === trimmed);
    if (direct) return direct;
    const partial = progs.find(p => p.toLowerCase().includes(trimmed) || trimmed.includes(p.toLowerCase()));
    if (partial) return partial;
    return pName.trim();
  }

  loadStudentData(): void {
    const user = this.authService.getCurrentUser();

    if (!user) {
      console.warn('No user found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    this.applyUserDataToForm(user);

    // Also fetch fresh profile from server in case user data was updated via Excel upload
    this.authService.getProfile().subscribe({
      next: (profile) => {
        if (profile) {
          this.authService.updateCurrentUser(profile);
          this.applyUserDataToForm(this.authService.getCurrentUser());
        }
      },
      error: (err) => console.warn('Could not refresh profile from server:', err)
    });
  }

  private applyUserDataToForm(user: any): void {
    if (!user) return;

    // Build full name
    const fullName = [
      user.firstName,
      user.middleName,
      user.lastName
    ]
        .filter((name): name is string => !!name && name.trim().length > 0)
        .join(' ');

    let residenceType = '';
    let hostelHall = '';
    let wing = user.wing || '';
    let block = user.block || '';
    let roomNumber = user.roomNumber || '';

    if (user.hall) {
      if (user.hall === 'Non-Hostel Dwellers' || user.hall === 'Off Campus') {
        residenceType = 'Non-Hostel Dwellers';
      } else if (this.hallOptions.includes(user.hall)) {
        residenceType = 'Hostel Dwellers';
        hostelHall = user.hall;
      }
    }

    const sponsorValue = this.sponsorOptions.includes(user.sponsor) ? user.sponsor : '';

    const rawCollege = user.college && user.college !== 'Not selected' ? user.college : (user.faculty || '');
    const matchedCollege = this.findMatchingCollege(rawCollege);

    const rawDept = user.department && user.department !== 'Not selected' ? user.department : '';
    const matchedDept = this.findMatchingDepartment(matchedCollege, rawDept);

    const rawProg = user.programme && user.programme !== 'Not selected' ? user.programme : '';
    const matchedProg = this.findMatchingProgramme(matchedCollege, matchedDept, rawProg);

    // Patch form with user data
    this.requestForm.patchValue({
      studentName: fullName || user.fullName || 'Student Name',
      registrationNumber: user.registrationNumber || user.studentId || 'Not Available',
      email: user.email || '',
      phoneNumber: user.phoneNumber || user.phone || '',
      physicalAddress: user.physicalAddress || user.address || '',
      college: matchedCollege || '',
      department: matchedDept || '',
      programme: matchedProg || '',
      residenceType: residenceType,
      hostelHall: hostelHall,
      wing: wing,
      block: block,
      roomNumber: roomNumber,
      sponsor: sponsorValue,
      photo: user.photo || ''
    });

    // Set photo preview if exists
    if (user.photo) {
      this.photoPreview = user.photo;
    }

    console.log('Form patched with user data:', this.requestForm.value);
  }

  private loadExistingRequest(): void {
    const user = this.authService.getCurrentUser();

    if (!user) {
      return;
    }

    const request = this.clearanceService.getStudentRequests(user.id).at(-1);

    if (!request) {
      return;
    }

    const resType = request.residenceType === 'Hostel Dwellers'
      ? 'Hostel Dwellers'
      : (request.hall && request.hall !== 'Off Campus' && request.hall !== 'Non-Hostel Dwellers'
          ? 'Hostel Dwellers'
          : 'Non-Hostel Dwellers');

    const hall = resType === 'Hostel Dwellers' ? (request.hall || '') : '';
    const wing = (resType === 'Hostel Dwellers' && hall === 'CoICT Hostels') ? (request.wing || '') : '';
    const block = (resType === 'Hostel Dwellers' && (hall === 'Mabibo Hostels' || hall === 'Magufuli Hostels')) ? (request.block || '') : '';
    const roomNumber = resType === 'Hostel Dwellers' ? (request.roomNumber || '') : '';
    const sponsorVal = this.sponsorOptions.includes(request.sponsor || '') ? request.sponsor : '';

    this.requestForm.patchValue({
      studentName: request.studentName || this.requestForm.controls.studentName.value,
      registrationNumber: request.registrationNumber || this.requestForm.controls.registrationNumber.value,
      email: request.email || user.email || '',
      phoneNumber: request.phoneNumber || user.phoneNumber || user.phone || '',
      physicalAddress: request.physicalAddress || request.address || user.physicalAddress || user.address || '',
      college: request.college,
      department: request.department,
      programme: request.programme,
      residenceType: resType,
      hostelHall: hall,
      wing: wing,
      block: block,
      roomNumber: roomNumber,
      residenceEvidence: request.residenceEvidence || '',
      sponsor: sponsorVal,
      photo: request.photo || this.requestForm.controls.photo.value,
      confirm: true
    });

    if (request.photo) {
      this.photoPreview = request.photo;
    }
  }

  // =====================================================
  // COLLEGE CHANGED
  // =====================================================

  onCollegeChange(): void {
    this.requestForm.patchValue({
      department: '',
      programme: ''
    });
  }

  // =====================================================
  // DEPARTMENT CHANGED
  // =====================================================

  onDepartmentChange(): void {
    this.requestForm.patchValue({
      programme: ''
    });
  }

  onResidenceTypeChange(): void {
    const resType = this.requestForm.controls.residenceType.value;
    if (resType !== 'Hostel Dwellers') {
      this.requestForm.patchValue({
        hostelHall: '',
        wing: '',
        block: '',
        roomNumber: '',
        residenceEvidence: ''
      });
    }
  }

  onHallChange(): void {
    this.requestForm.patchValue({
      wing: '',
      block: ''
    });
  }

  onRoomNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value === '' || input.value === null) {
      this.requestForm.controls.roomNumber.setValue('');
      return;
    }

    const rawVal = input.value.replace(/[^0-9]/g, '');
    let numVal = parseInt(rawVal, 10);
    if (isNaN(numVal) || numVal < 0) {
      numVal = 0;
    }
    const sanitizedStr = numVal.toString();
    if (input.value !== sanitizedStr) {
      input.value = sanitizedStr;
    }
    this.requestForm.controls.roomNumber.setValue(sanitizedStr);
  }

  onResidenceEvidenceSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    this.requestForm.controls.residenceEvidence.setValue('');

    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      this.toastService.warning('Invalid File', 'Residence document must be an image or PDF file.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.requestForm.controls.residenceEvidence.setValue(reader.result as string);
    };
    reader.onerror = () => {
      this.toastService.error('Read Error', 'Failed to read residence document.');
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  // =====================================================
  // PHOTO UPLOAD - ANY SIZE ACCEPTED
  // =====================================================

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    // Accept JPG / JPEG images of ANY dimensions
    if (file.type !== 'image/jpeg' && file.type !== 'image/jpg') {
      this.toastService.warning('Invalid Format', 'Passport photo must be a .jpg or .jpeg image.');
      input.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const maxDimension = 600;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext('2d');
        if (!context) {
          this.toastService.error('Process Error', 'Failed to process image file.');
          input.value = '';
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const compressedPhoto = canvas.toDataURL('image/jpeg', 0.75);
        this.photoPreview = compressedPhoto;
        this.requestForm.patchValue({
          photo: compressedPhoto
        });
      };

      image.onerror = () => {
        this.toastService.error('Process Error', 'Failed to process image file.');
        input.value = '';
      };

      image.src = reader.result as string;
    };

    reader.onerror = () => {
      this.toastService.error('Read Error', 'Failed to read image file.');
      input.value = '';
    };

    reader.readAsDataURL(file);
  }

  // =====================================================
  // CANCEL
  // =====================================================

  cancel(): void {
    this.router.navigate(['/dashboard']);
  }

  // =====================================================
  // SUBMIT - IMPROVED WITH BETTER ERROR HANDLING
  // =====================================================
// clearance-request.component.ts - Updated submit method

  async submit(): Promise<void> {
    this.isSubmitting = true;

    if (this.hasSubmittedRequest || (this.hasExistingRequest() && !this.revisionRequest)) {
      this.hasSubmittedRequest = true;
      this.loadExistingRequest();
      this.requestForm.disable();
      this.isSubmitting = false;
      return;
    }

    if (this.requestForm.invalid) {
      this.toastService.warning('Form Incomplete', 'Please complete all required clearance information correctly.');
      this.requestForm.markAllAsTouched();
      this.isSubmitting = false;
      return;
    }

    const user = this.authService.getCurrentUser();

    if (!user) {
      this.toastService.error('Auth Required', 'You must be logged in to submit a clearance request.');
      this.router.navigate(['/login']);
      this.isSubmitting = false;
      return;
    }

    const value = this.requestForm.getRawValue();

    if (value.residenceType === 'Hostel Dwellers') {
      if (!value.hostelHall || !this.hallOptions.includes(value.hostelHall)) {
        this.toastService.warning('Location Details', 'Please select a valid hall of residence.');
        this.isSubmitting = false;
        return;
      }

      if (this.isCoictHostel && (!value.wing || !this.coictWings.includes(value.wing))) {
        this.toastService.warning('Location Details', 'Please select a valid wing.');
        this.isSubmitting = false;
        return;
      }

      if (this.isBlockHostel && (!value.block || !this.blockOptions.includes(value.block))) {
        this.toastService.warning('Location Details', 'Please select a valid block.');
        this.isSubmitting = false;
        return;
      }

      if (value.roomNumber === null || value.roomNumber === undefined || value.roomNumber.toString().trim() === '') {
        this.toastService.warning('Location Details', 'Please enter your room number.');
        this.isSubmitting = false;
        return;
      }

      const roomNum = Number(value.roomNumber);
      if (isNaN(roomNum) || roomNum < 0 || !Number.isInteger(roomNum)) {
        this.toastService.warning('Invalid Room Number', 'Room number must be a non-negative whole number.');
        this.isSubmitting = false;
        return;
      }
    }

    if (value.residenceType === 'Non-Hostel Dwellers' && !value.residenceEvidence) {
      this.toastService.warning('Document Required', 'Please upload a document showing proof of your non-hostel residence.');
      this.isSubmitting = false;
      return;
    }

    if (!value.sponsor || !this.sponsorOptions.includes(value.sponsor)) {
      this.toastService.warning('Sponsor Required', 'Please select a valid sponsor.');
      this.isSubmitting = false;
      return;
    }

    if (!value.email || this.requestForm.controls.email.invalid) {
      this.toastService.warning('Email Address', 'Please enter a valid email address.');
      this.isSubmitting = false;
      return;
    }

    if (!value.phoneNumber || this.requestForm.controls.phoneNumber.invalid) {
      this.toastService.warning('Phone Number', 'Please enter a valid phone number.');
      this.isSubmitting = false;
      return;
    }

    if (!value.physicalAddress || this.requestForm.controls.physicalAddress.invalid) {
      this.toastService.warning('Physical Address', 'Please enter your physical address.');
      this.isSubmitting = false;
      return;
    }

    if (!value.studentName || !value.registrationNumber) {
      this.toastService.error('Incomplete Profile', 'Student information is missing. Please refresh the page.');
      this.isSubmitting = false;
      return;
    }

    const finalHall = value.residenceType === 'Hostel Dwellers' ? value.hostelHall : 'Non-Hostel Dwellers';
    const finalWing = (value.residenceType === 'Hostel Dwellers' && this.isCoictHostel) ? value.wing : '';
    const finalBlock = (value.residenceType === 'Hostel Dwellers' && this.isBlockHostel) ? value.block : '';
    const finalRoomNumber = value.residenceType === 'Hostel Dwellers' ? value.roomNumber.toString() : '';

    try {
      const existingRequest = this.revisionRequest;

      if (existingRequest) {
        const resubmitted = this.clearanceService.resubmitRequest(existingRequest.id, {
          college: value.college,
          department: value.department,
          programme: value.programme,
          email: value.email,
          phoneNumber: value.phoneNumber,
          physicalAddress: value.physicalAddress,
          address: value.physicalAddress,
          hall: finalHall,
          wing: finalWing,
          block: finalBlock,
          roomNumber: finalRoomNumber,
          residenceType: value.residenceType as 'Hostel Dwellers' | 'Non-Hostel Dwellers',
          residenceEvidence: value.residenceEvidence,
          sponsor: value.sponsor,
          photo: value.photo
        });

        if (!resubmitted) {
          throw new Error('This request could not be resubmitted. Please refresh and try again.');
        }

        user.email = value.email;
        user.phoneNumber = value.phoneNumber;
        user.physicalAddress = value.physicalAddress;
        user.address = value.physicalAddress;
        user.hall = finalHall;
        user.wing = finalWing;
        user.block = finalBlock;
        user.roomNumber = finalRoomNumber;
        user.sponsor = value.sponsor;

        this.authService.updateCurrentUser(user);
        this.notificationService.createNotification(
            user.id,
            'Clearance request resubmitted',
            `Your corrected request has been sent back to ${existingRequest.revisionOffice} for review.`,
            'success'
        );
        this.toastService.success('Resubmitted', 'Your corrected request has been resubmitted successfully.');
        this.router.navigate(['/profile']);
        return;
      }

      // Update student account
      user.email = value.email;
      user.phoneNumber = value.phoneNumber;
      user.physicalAddress = value.physicalAddress;
      user.address = value.physicalAddress;
      user.college = value.college;
      user.department = value.department;
      user.programme = value.programme;
      user.hall = finalHall;
      user.wing = finalWing;
      user.block = finalBlock;
      user.roomNumber = finalRoomNumber;
      user.sponsor = value.sponsor;
      user.photo = value.photo;
      user.fullName = value.studentName;
      user.registrationNumber = value.registrationNumber;

      this.authService.updateCurrentUser(user);

      this.authService.updateProfile({
        fullName: value.studentName,
        email: value.email,
        phoneNumber: value.phoneNumber,
        physicalAddress: value.physicalAddress,
        address: value.physicalAddress,
        college: value.college,
        department: value.department,
        programme: value.programme,
        hall: finalHall,
        wing: finalWing,
        block: finalBlock,
        roomNumber: finalRoomNumber,
        sponsor: value.sponsor,
        photo: value.photo
      }).subscribe({
        next: profile => this.authService.updateCurrentUser(profile),
        error: error => console.error('Unable to persist student profile:', error)
      });

      await firstValueFrom(this.clearanceService.submitBackendRequest({
        studentName: value.studentName,
        registrationNumber: value.registrationNumber,
        email: value.email,
        phoneNumber: value.phoneNumber,
        physicalAddress: value.physicalAddress,
        address: value.physicalAddress,
        programme: value.programme,
        college: value.college,
        department: value.department,
        academicYear: new Date().getFullYear().toString(),
        hall: finalHall,
        wing: finalWing,
        block: finalBlock,
        roomNumber: finalRoomNumber,
        sponsor: value.sponsor,
        photo: value.photo
      }));

      this.clearanceService.createFullRequest({
        studentId: user.id,
        studentName: value.studentName,
        registrationNumber: value.registrationNumber,
        email: value.email,
        phoneNumber: value.phoneNumber,
        physicalAddress: value.physicalAddress,
        address: value.physicalAddress,
        college: value.college,
        department: value.department,
        programme: value.programme,
        hall: finalHall,
        wing: finalWing,
        block: finalBlock,
        roomNumber: finalRoomNumber,
        residenceType: value.residenceType as 'Hostel Dwellers' | 'Non-Hostel Dwellers',
        residenceEvidence: value.residenceEvidence,
        sponsor: value.sponsor,
        photo: value.photo
      });

      this.hasSubmittedRequest = true;
      this.requestForm.disable();

      this.notificationService.createNotification(
          user.id,
          'Clearance request submitted',
          'Your clearance request is waiting for Convocation approval.',
          'success'
      );
      this.toastService.success('Submitted', 'Your clearance request has been submitted successfully.');

      this.router.navigate(['/profile']);

    } catch (error: any) {
      console.error('Error submitting request:', error);

      if (error.message?.includes('already have a submitted clearance request')) {
        this.hasSubmittedRequest = true;
        this.loadExistingRequest();
        this.requestForm.disable();
        return;
      }

      // Error toast is handled by errorInterceptor or specifically caught above
    } finally {
      this.isSubmitting = false;
    }
  }

}
