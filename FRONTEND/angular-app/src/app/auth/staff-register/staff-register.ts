import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';
import { ToastService } from '../../core/services/toast.service';

type StaffRole = Exclude<UserRole, 'Student'>;

@Component({
  selector: 'app-staff-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './staff-register.html',
  styleUrl: './staff-register.css'
})
export class StaffRegister {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly staffRoles: StaffRole[] = ['Academic Staff', 'Administrator', 'Convocation', 'DARUSO', 'Dean of Students', 'Department', 'Finance', 'Games Coach', 'Hall Warden', 'ICT', 'Laboratory', 'Library', 'Principal', 'Smart Card', 'USAB', 'Workshop'];
  readonly laboratoryDepartments = ['Anatomy laboratory', 'Pathology laboratory', 'Biochemistry', 'Microbiology & Immunology', 'Physiology', 'Parasitology & Entomology', 'Pharmacology'];

  readonly collegeDepartments: Record<string, string[]> = {
    'College of Agricultural Sciences and Food Technology (CoAF)': ['Agricultural Economics and Business', 'Agricultural Engineering', 'Crop Science and Beekeeping Technology', 'Food Science and Technology'],
    'College of Humanities (CoHU)': ['Archaeology and Heritage Studies', 'Creative Arts', 'Foreign Languages and Linguistics', 'History', 'Literature', 'Philosophy and Religious Studies'],
    'College of Social Sciences (CoSS)': ['Geography', 'Political Science and Public Administration', 'Sociology', 'Statistics'],
    'College of Engineering and Technology (CoET)': ['Chemical and Process Engineering', 'Electrical Engineering', 'Mechanical and Industrial Engineering', 'Structural and Construction Engineering', 'Transportation and Geotechnical Engineering', 'Water Resources Engineering'],
    'College of Natural and Applied Sciences (CoNAS)': ['Zoology and Wildlife Conservation', 'Molecular Biology and Biotechnology', 'Botany', 'Chemistry', 'Mathematics', 'Physics'],
    'College of Information and Communication Technologies (CoICT)': ['Computer Science and Engineering', 'Electronics and Telecommunications Engineering'],
    'College of Mines and Geosciences (SoMG)': ['Geosciences', 'Mining and Mineral Processing Engineering', 'Petroleum Science and Engineering'],
    'University of Dar es Salaam Business School (UDBS)': ['Accounting', 'Finance', 'General Management', 'Marketing'],
    'College of Education (SoED)': ['Educational Foundations, Management and Lifelong Learning', 'Educational Psychology and Curriculum Studies', 'Physical Education and Sport Sciences'],
    'University of Dar es Salaam Law School (UDSoL)': ['Public Law', 'Private Law', 'Economic Law'],
    'University of Dar es Salaam Economic School (UDSE)': ['Economics', 'Applied Economics'],
    'Institute of Languages and Cultures (IKS)': ['Kiswahili Language and Linguistics (ILUKII)', 'Literature, Communication and Publishing (IFAMU)'],
    'Institute of Marine Sciences (IMS)': ['Marine and Coastal Resources Management', 'Marine Technology and Innovation'],
    'Dar es Salaam University College of Education (DUCE)': ['Educational Foundations, Management and Lifelong Learning', 'Educational Psychology and Curriculum Studies', 'Economics and Geography', 'History, Political Science and Development Studies', 'Languages and Communication Skills', 'Biology', 'Chemistry', 'Mathematics', 'Physics']
  };

  errorMessage = '';
  successMessage = '';
  isLoading = false;

  form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    middleName: [''],
    lastName: ['', Validators.required],
    staffId: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    role: ['' as StaffRole | '', Validators.required],
    college: [''],
    department: [''],
    laboratory: [''],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
    acceptTerms: [false, Validators.requiredTrue]
  });

  constructor() {
    this.collegeDepartments['School of Aquatic Sciences and Fisheries Technology (SoAF)'] = ['Aquatic Sciences and Fisheries Technology'];
    this.collegeDepartments['School of Journalism and Mass Communication (SJMC)'] = ['Journalism', 'Mass Communication', 'Public Relations and Advertising'];
    this.collegeDepartments['Institute of Development Studies (IDS)'] = ['Development Studies'];
    this.collegeDepartments['Mkwawa University College of Education (MUCE)'] = ['Educational Foundations', 'Languages and Literature', 'Mathematics, Science and Technical Education', 'Social Sciences'];
    this.collegeDepartments['Mbeya College of Health and Allied Sciences (MCHAS)'] = [
      'Social Service',
      'Biochemistry & Pharmacology',
      'Microbiology & Immuniology / Parasitology & Entomology',
      'Pathology, Anatomy & Physiology',
      'Internal Medicine',
      'Radiology and Nuclear medicine',
      'Pediatric & Child Health',
      'Emergency Medicine',
      'Anesthesiology & Critical Care',
      'General Surgery',
      'Psychiatric & Mental Health',
      'Dental & Oral Surgery'
    ];
    this.collegeDepartments['UDSM-MRI'] = ['Geology and Mineral Exploration', 'Petroleum Geosciences', 'Mining Engineering', 'Mineral Processing Engineering', 'Environmental Engineering and Management in Mines', 'Land and Mine Surveying'];

    this.form.controls.role.valueChanges.subscribe(() => this.updateDepartmentValidators());
  }

  get isDepartmentStaff(): boolean {
    return this.form.controls.role.value === 'Department';
  }

  get isPrincipalStaff(): boolean {
    return this.form.controls.role.value === 'Principal';
  }

  get isLaboratoryStaff(): boolean {
    return this.form.controls.role.value === 'Laboratory';
  }

  get departments(): string[] {
    return this.collegeDepartments[this.form.controls.college.value] ?? [];
  }

  onCollegeChange(): void {
    this.form.controls.department.setValue('');
  }

  register(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.updateDepartmentValidators();

    if (this.form.invalid) {
      this.form.markAllAsTouched();

      const controls = this.form.controls;
      if (controls.email.errors?.['email']) {
        this.errorMessage = 'Please enter a valid official email address.';
      } else if (controls.password.errors?.['minlength']) {
        this.errorMessage = 'Password must be at least 8 characters long.';
      } else if (controls.acceptTerms.errors?.['required']) {
        this.errorMessage = 'You must accept the terms of service.';
      } else if (this.isDepartmentStaff && (controls.college.invalid || controls.department.invalid)) {
        this.errorMessage = 'Please select both your college and department.';
      } else if (this.isPrincipalStaff && controls.college.invalid) {
        this.errorMessage = 'Please select the Principal college.';
      } else {
        this.errorMessage = 'Please complete all required fields correctly.';
      }
      return;
    }

    const value = this.form.getRawValue();
    if (value.password !== value.confirmPassword) {
      this.errorMessage = 'The passwords do not match.';
      return;
    }

    const userData = {
      firstName: value.firstName,
      middleName: value.middleName || '',
      lastName: value.lastName,
      registrationNumber: value.staffId,
      email: value.email,
      phone: value.phone,
      password: value.password,
      role: value.role,
      department: this.isDepartmentStaff ? value.department : value.role,
      college: this.isDepartmentStaff || this.isPrincipalStaff ? value.college : 'Administration',
      laboratory: this.isLaboratoryStaff ? value.laboratory : ''
    };

    this.isLoading = true;
    this.authService.register(userData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = response.message || 'Registration successful!';
        this.toastService.success('Registration Success', 'Staff account created successfully.');

        // Auto-login after registration
        this.authService.login(value.email, value.password).subscribe({
          next: (user) => {
            setTimeout(() => {
              this.router.navigate([this.redirectPathFor(user.role)]);
            }, 1500);
          },
          error: () => {
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 2000);
          }
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Unable to create the staff account.';
        this.toastService.error('Registration Failed', this.errorMessage);
      }
    });
  }

  private updateDepartmentValidators(): void {
    const collegeValidators = this.isDepartmentStaff || this.isPrincipalStaff ? [Validators.required] : [];
    const departmentValidators = this.isDepartmentStaff ? [Validators.required] : [];
    this.form.controls.college.setValidators(collegeValidators);
    this.form.controls.department.setValidators(departmentValidators);
    this.form.controls.laboratory.setValidators(this.isLaboratoryStaff ? [Validators.required] : []);

    if (!this.isDepartmentStaff && !this.isPrincipalStaff) {
      this.form.controls.college.setValue('');
      this.form.controls.department.setValue('');
    }

    if (!this.isLaboratoryStaff) {
      this.form.controls.laboratory.setValue('');
    }

    this.form.controls.college.updateValueAndValidity({ emitEvent: false });
    this.form.controls.department.updateValueAndValidity({ emitEvent: false });
    this.form.controls.laboratory.updateValueAndValidity({ emitEvent: false });
  }

  // In staff-register.component.ts - Update the redirectPathFor method

  private redirectPathFor(role: UserRole): string {
    const map: Record<UserRole, string> = {
      Student: '/dashboard',
      Convocation: '/convocation/dashboard',  // Redirects to the dashboard
      'Games Coach': '/dashboard/games-coach',
      'Hall Warden': '/dashboard/hall-warden',
      USAB: '/dashboard/usab',
      DARUSO: '/dashboard/daruso',
      Library: '/dashboard/library',
      'Dean of Students': '/dashboard/dean-of-students',
      'Smart Card': '/dashboard/smart-card',
      Department: '/department/dashboard',
      Finance: '/dashboard/finance',
      ICT: '/dashboard/ict',
      'Academic Staff': '/dashboard/academic',
      Administrator: '/dashboard/admin',
      Principal: '/dashboard/principal',
      Workshop: '/dashboard/workshop',
      Laboratory: '/dashboard/laboratory'
    };
    return map[role] ?? '/dashboard';
  }
}
