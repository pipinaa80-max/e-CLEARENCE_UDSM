// clearance-request.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';

import { ClearanceService } from '../../core/services/clearance.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

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
    ReactiveFormsModule
  ],
  templateUrl: './request.html',
  styleUrl: './request.css'
})
export class ClearanceRequestComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly clearanceService = inject(ClearanceService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  // =====================================================
  // CLEARANCE FORM
  // =====================================================

  requestForm = this.fb.nonNullable.group({
    studentName: ['', Validators.required],
    registrationNumber: ['', Validators.required],
    college: ['', Validators.required],
    department: ['', Validators.required],
    programme: ['', Validators.required],
    hall: [''],
    roomNumber: [''],
    sponsor: [''],
    photo: [''],
    confirm: [false, Validators.requiredTrue]
  });

  photoPreview: string | null = null;
  errorMessage = '';
  isSubmitting = false;

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
  // LOAD STUDENT INFORMATION ON INIT
  // =====================================================

  ngOnInit(): void {
    this.loadStudentData();
  }

  loadStudentData(): void {
    const user = this.authService.getCurrentUser();

    if (!user) {
      console.warn('No user found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    // Build full name
    const fullName = [
      user.firstName,
      user.middleName,
      user.lastName
    ]
        .filter((name): name is string => !!name && name.trim().length > 0)
        .join(' ');

    // Patch form with user data
    this.requestForm.patchValue({
      studentName: fullName || user.fullName || 'Student Name',
      registrationNumber: user.registrationNumber || user.studentId || 'Not Available',
      college: user.college && user.college !== 'Not selected' ? user.college : '',
      department: user.department && user.department !== 'Not selected' ? user.department : '',
      programme: user.programme && user.programme !== 'Not selected' ? user.programme : '',
      hall: user.hall || '',
      roomNumber: user.roomNumber || '',
      sponsor: user.sponsor || '',
      photo: user.photo || ''
    });

    // Set photo preview if exists
    if (user.photo) {
      this.photoPreview = user.photo;
    }

    console.log('Form patched with user data:', this.requestForm.value);
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

  // =====================================================
  // PHOTO UPLOAD - ANY SIZE ACCEPTED
  // =====================================================

  onPhotoSelected(event: Event): void {
    this.errorMessage = '';

    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    // Accept JPG / JPEG images of ANY dimensions
    if (file.type !== 'image/jpeg' && file.type !== 'image/jpg') {
      this.errorMessage = 'Passport photo must be a .jpg or .jpeg image.';
      input.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = reader.result as string;
      // No width/height restriction - any size accepted
      this.photoPreview = dataUrl;
      this.requestForm.patchValue({
        photo: dataUrl
      });
    };

    reader.onerror = () => {
      this.errorMessage = 'Failed to read image file.';
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

  submit(): void {
    this.errorMessage = '';
    this.isSubmitting = true;

    if (this.requestForm.invalid) {
      this.errorMessage = 'Please complete all required clearance information correctly.';
      this.requestForm.markAllAsTouched();
      this.isSubmitting = false;
      return;
    }

    const user = this.authService.getCurrentUser();

    if (!user) {
      this.errorMessage = 'You must be logged in to submit a clearance request.';
      this.router.navigate(['/login']);
      this.isSubmitting = false;
      return;
    }

    const value = this.requestForm.getRawValue();

    if (!value.studentName || !value.registrationNumber) {
      this.errorMessage = 'Student information is missing. Please refresh the page and try again.';
      this.isSubmitting = false;
      return;
    }

    // Update student account
    user.college = value.college;
    user.department = value.department;
    user.programme = value.programme;
    user.hall = value.hall;
    user.roomNumber = value.roomNumber;
    user.sponsor = value.sponsor;
    user.photo = value.photo;
    user.fullName = value.studentName;
    user.registrationNumber = value.registrationNumber;

    this.authService.updateCurrentUser(user);

    try {
      // Use the existing service method with individual parameters
      this.clearanceService.createRequest(
          user.id,           // studentId
          value.college,     // college
          value.department,  // department
          value.programme    // programme
      );

      this.notificationService.createNotification(
          user.id,
          'Clearance request submitted',
          'Your clearance request is waiting for Convocation approval.',
          'success'
      );

      this.router.navigate(['/profile']);

    } catch (error: any) {
      console.error('Error submitting request:', error);
      this.errorMessage = error.message || 'Failed to submit clearance request. Please try again.';
    } finally {
      this.isSubmitting = false;
    }
  }

}