import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ClearanceService } from '../../core/services/clearance.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-clearance-request',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './request.html',
  styleUrl: './request.css'
})
export class ClearanceRequestComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly clearanceService = inject(ClearanceService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  requestForm = this.fb.nonNullable.group({
    studentName: ['', Validators.required],
    registrationNumber: ['', Validators.required],
    college: ['', Validators.required],
    department: ['', Validators.required],
    programme: ['', Validators.required],
    academicYear: ['', Validators.required],
    graduationYear: ['', Validators.required],
    hall: [''],
    roomNumber: [''],
    sponsor: [''],
    photo: [''],
    confirm: [false, Validators.requiredTrue]
  });

  photoPreview: string | null = null;
  errorMessage = '';
  isLoading = false;
  userDataLoaded = false;

  // These should ideally come from backend API
  readonly programmes: Record<string, string[]> = {
    'College of Agricultural Sciences and Food Technology (CoAF)': ['BSc in Beekeeping Science and Technology', 'BSc in Agricultural Engineering and Mechanization', 'BSc in Food Science and Technology', 'BSc in Agricultural and Natural Resources Economics and Business', 'BSc in Crop Science and Technology'],
    'College of Humanities (CoHU)': ['BA in Archeology', 'BA in Archeology and History', 'BA in Archeology and Geography', 'BA in Communication Studies', 'BA in Diplomatic and Military History', 'BA in Heritage Management', 'BA in Art and Design', 'BA in Theatre Arts', 'BA in Film and Television Studies', 'BA in Philosophy and Ethics', 'BA in Music', 'BA in Language Studies', 'BA in Literature', 'BA in History', 'BA in History and Political Science', 'BA in History, Cultural Heritage Management & Tourism', 'BA with Education', 'BA with Education (Chinese and English)'],
    'College of Social Sciences (CoSS)': ['BA in Anthropology', 'BA in Geography and Environmental Studies', 'BA in Political Science and Public Administration', 'BA in Sociology', 'BA in Statistics', 'BA in Social Work', 'BA in Psychology', 'BA in Library and Information Studies', 'BA with Education'],
    'College of Engineering and Technology (CoET)': ['BSc in Chemical and Process Engineering', 'BSc in Civil Engineering', 'BSc in Electrical Engineering', 'BSc in Mechanical Engineering', 'BSc in Industrial Engineering', 'BSc in Textile Design and Technology', 'BSc in Textile Engineering', 'Bachelor of Architecture', 'BSc in Quantity Surveying', 'BSc in Geomatics'],
    'College of Natural and Applied Sciences (CoNAS)': ['BSc in Actuarial Sciences', 'BSc in Applied Zoology', 'BSc in Botanical Sciences', 'BSc in Chemistry', 'BSc in Microbiology', 'BSc in Molecular Biology and Biotechnology', 'BSc in Wildlife Science and Conservation', 'BSc with Education', 'BSc in Petroleum Chemistry', 'BSc in Meteorology', 'BSc in Applied Microbiology and Chemistry', 'BSc in Chemistry and Physics', 'BSc in Mathematics and Statistics', 'BSc in Physics (Medical Physics)'],
    'College of Information and Communication Technologies (CoICT)': ['BSc in Computer Science', 'BSc in Electronic Science and Communication', 'BSc in Computer Engineering and Information Technology', 'BSc in Telecommunications Engineering', 'BSc in Business Information Technology'],
    'School of Mines and Geosciences (SoMG)': ['BSc in Geophysics', 'BSc in Geology and Geothermal Resources', 'BSc in Petroleum Geology', 'BSc in Geology', 'BSc with Geology', 'BSc in Engineering Geology', 'BSc in Metallurgy and Mineral Processing Engineering', 'BSc in Mining Engineering', 'BSc in Petroleum Engineering'],
    'School of Aquatic Sciences and Fisheries Technology (SoAF)': ['BSc in Aquatic Sciences and Fisheries'],
    'School of Journalism and Mass Communication (SJMC)': ['BA in Journalism', 'BA in Mass Communication', 'BA in Public Relations and Advertising'],
    'University of Dar es Salaam Business School (UDBS)': ['Bachelor of Commerce in Accounting', 'Bachelor of Commerce in Banking and Financial Services', 'Bachelor of Commerce in Finance', 'Bachelor of Commerce in Human Resources Management', 'Bachelor of Commerce in Marketing', 'Bachelor of Commerce in Tourism and Hospitality Management', 'Bachelor of Business Administration (Evening Programme)', 'Bachelor of Commerce in Procurement and Supply Chain Management'],
    'University of Dar es Salaam School of Economics (UDSE)': ['BA in Economics', 'BA in Economics and Statistics'],
    'School of Education (SoED)': ['Bachelor of Education in Early Childhood Education', 'Bachelor of Education in Physical Education and Sport Sciences', 'Bachelor of Arts in Gender Studies and Community Development'],
    'University of Dar es Salaam School of Law (UDSoL)': ['Bachelor of Laws (LL.B)', 'Bachelor of Arts in Law Enforcement'],
    'Institute of Kiswahili Studies (IKS)': ['BA in Kiswahili'],
    'Institute of Marine Sciences (IMS)': ['Bachelor of Science in Marine Sciences'],
    'Institute of Development Studies (IDS)': ['BA in Development Studies'],
    'Dar es Salaam University College of Education (DUCE)': ['Bachelor of Arts with Education', 'Bachelor of Science with Education', 'Bachelor of Arts in Disaster Risk Management'],
    'Mkwawa University College of Education (MUCE)': ['Bachelor of Arts with Education', 'Bachelor of Science with Education', 'Bachelor of Science in Chemistry'],
    'Mbeya College of Health and Allied Sciences (MCHAS)': ['Doctor of Medicine (MD)', 'Doctor of Dental Surgery (DDS)'],
    'UDSM Mineral Resources Institute (UDSM-MRI)': ['Ordinary Diploma in Geology and Mineral Exploration', 'Ordinary Diploma in Petroleum Geosciences', 'Ordinary Diploma in Mining Engineering', 'Ordinary Diploma in Mineral Processing Engineering', 'Ordinary Diploma in Environmental Engineering and Management in Mines', 'Ordinary Diploma in Land and Mine Surveying', 'Technician Certificate in Geology and Mineral Exploration', 'Technician Certificate in Petroleum Geosciences', 'Technician Certificate in Mining Engineering', 'Technician Certificate in Mineral Processing Engineering', 'Technician Certificate in Environmental Engineering and Management in Mines', 'Technician Certificate in Land and Mine Surveying', 'Basic Certificate in Geology and Mineral Exploration', 'Basic Certificate in Petroleum Geosciences', 'Basic Certificate in Mining Engineering', 'Basic Certificate in Mineral Processing Engineering', 'Basic Certificate in Environmental Engineering and Management in Mines', 'Basic Certificate in Land and Mine Surveying']
  };

  readonly departmentsByCollege: Record<string, string[]> = {
    'College of Agricultural Sciences and Food Technology (CoAF)': ['Agricultural Economics and Business', 'Agricultural Engineering', 'Crop Science and Beekeeping Technology', 'Food Science and Technology'],
    'College of Humanities (CoHU)': ['Archaeology and Heritage Studies', 'Creative Arts', 'Foreign Languages and Linguistics', 'History', 'Literature', 'Philosophy and Religious Studies'],
    'College of Social Sciences (CoSS)': ['Geography', 'Political Science and Public Administration', 'Sociology', 'Statistics'],
    'College of Engineering and Technology (CoET)': ['Chemical and Process Engineering', 'Electrical Engineering', 'Mechanical and Industrial Engineering', 'Structural and Construction Engineering', 'Transportation and Geotechnical Engineering', 'Water Resources Engineering'],
    'College of Natural and Applied Sciences (CoNAS)': ['Zoology and Wildlife Conservation', 'Molecular Biology and Biotechnology', 'Botany', 'Chemistry', 'Mathematics', 'Physics'],
    'College of Information and Communication Technologies (CoICT)': ['Computer Science and Engineering', 'Electronics and Telecommunications Engineering'],
    'School of Mines and Geosciences (SoMG)': ['Geosciences', 'Mining and Mineral Processing Engineering', 'Petroleum Science and Engineering'],
    'University of Dar es Salaam Business School (UDBS)': ['Accounting', 'Finance', 'General Management', 'Marketing'],
    'University of Dar es Salaam School of Economics (UDSE)': ['Economics', 'Applied Economics'],
    'School of Education (SoED)': ['Educational Foundations, Management and Lifelong Learning', 'Educational Psychology and Curriculum Studies', 'Physical Education and Sport Sciences'],
    'University of Dar es Salaam School of Law (UDSoL)': ['Public Law', 'Private Law', 'Economic Law'],
    'Institute of Kiswahili Studies (IKS)': ['Kiswahili Language and Linguistics (ILUKII)', 'Literature, Communication and Publishing (IFAMU)'],
    'Institute of Marine Sciences (IMS)': ['Marine and Coastal Resources Management', 'Marine Technology and Innovation'],
    'Dar es Salaam University College of Education (DUCE)': ['Educational Foundations, Management and Lifelong Learning', 'Educational Psychology and Curriculum Studies', 'Economics and Geography', 'History, Political Science and Development Studies', 'Languages and Communication Skills', 'Biology', 'Chemistry', 'Mathematics', 'Physics']
  };

  ngOnInit(): void {
    this.loadUserData();
  }

  loadUserData(): void {
    this.isLoading = true;
    const user = this.authService.getCurrentUser();

    if (user) {
      // Patch form with user data
      this.requestForm.patchValue({
        studentName: user.fullName || '',
        registrationNumber: user.registrationNumber || '',
        college: (user.college && user.college !== 'Not selected') ? user.college : '',
        department: (user.department && user.department !== 'Not selected') ? user.department : '',
        programme: (user.programme && user.programme !== 'Not selected') ? user.programme : '',
        hall: user.hall || '',
        roomNumber: user.roomNumber || '',
        sponsor: user.sponsor || '',
        academicYear: user.academicYear || this.getCurrentAcademicYear(),
        graduationYear: user.graduationYear || ''
      });

      // Set photo preview if exists
      if (user.photo) {
        this.photoPreview = user.photo;
      }

      this.userDataLoaded = true;
      this.isLoading = false;
    } else {
      // If no user, navigate to login
      this.router.navigate(['/login']);
    }
  }

  getCurrentAcademicYear(): string {
    const currentYear = new Date().getFullYear();
    return `${currentYear}/${currentYear + 1}`;
  }

  get collegeList(): string[] {
    return Object.keys(this.programmes);
  }

  get departments(): string[] {
    const college = this.requestForm.controls.college.value;
    return this.departmentsByCollege[college] ?? ['College/School Academic Office'];
  }

  get programmeOptions(): string[] {
    const college = this.requestForm.controls.college.value;
    return this.programmes[college] ?? [];
  }

  onCollegeChange(): void {
    this.requestForm.patchValue({
      department: '',
      programme: ''
    });
  }

  onPhotoSelected(event: Event): void {
    this.errorMessage = '';
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    if (file.type !== 'image/jpeg' && file.type !== 'image/jpg') {
      this.errorMessage = 'Passport photo must be a .jpg image.';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        if (img.width !== 120 || img.height !== 150) {
          this.errorMessage = 'Passport photo must be exactly 120 x 150 pixels.';
          this.photoPreview = null;
          this.requestForm.patchValue({ photo: '' });
          input.value = '';
          return;
        }
        // Valid image
        this.photoPreview = dataUrl;
        this.requestForm.patchValue({ photo: dataUrl });
      };
      img.onerror = () => {
        this.errorMessage = 'Failed to read image file.';
        input.value = '';
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      this.errorMessage = 'Failed to read image file.';
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  submit(): void {
    this.errorMessage = '';
    this.isLoading = true;

    if (this.requestForm.invalid) {
      this.errorMessage = 'Please complete all clearance information correctly.';
      this.requestForm.markAllAsTouched();
      this.isLoading = false;
      return;
    }

    const user = this.authService.getCurrentUser();

    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    const value = this.requestForm.getRawValue();

    // Update user object with form values
    const updatedUser = {
      ...user,
      college: value.college,
      department: value.department,
      programme: value.programme,
      hall: value.hall || '',
      roomNumber: value.roomNumber || '',
      sponsor: value.sponsor || '',
      photo: value.photo || '',
      academicYear: value.academicYear,
      graduationYear: value.graduationYear
    };

    // Save updated user
    this.authService.updateCurrentUser(updatedUser);

    // Also update on backend
    this.authService.updateProfile(updatedUser).subscribe({
      next: () => {
        // Create clearance request
        this.clearanceService.createRequest(
            user.id,
            value.college,
            value.department,
            value.programme
        );

        // Create notification
        this.notificationService.createNotification(
            user.id,
            'Clearance request submitted',
            'Your clearance request is waiting for Convocation approval.',
            'success'
        );

        this.isLoading = false;
        this.router.navigate(['/profile']);
      },
      error: (error) => {
        console.error('Failed to update profile:', error);
        this.errorMessage = 'Failed to update profile. Please try again.';
        this.isLoading = false;
      }
    });
  }
}