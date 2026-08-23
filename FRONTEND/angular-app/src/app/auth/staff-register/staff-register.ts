import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';

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
  private readonly router = inject(Router);

  readonly staffRoles: StaffRole[] = ['Convocation', 'Games Coach', 'Hall Warden', 'USAB', 'DARUSO', 'Library', 'Dean of Students', 'Smart Card', 'Department', 'Principal', 'Finance', 'ICT', 'Academic Staff', 'Administrator'];

  readonly collegeDepartments: Record<string, string[]> = {
    CoAF: ['Agricultural Economics and Business', 'Agricultural Engineering', 'Crop Science and Beekeeping Technology', 'Food Science and Technology'],
    CoHU: ['Archaeology and Heritage Studies', 'Creative Arts', 'Foreign Languages and Linguistics', 'History', 'Literature', 'Philosophy and Religious Studies'],
    CoSS: ['Geography', 'Political Science and Public Administration', 'Sociology', 'Statistics'],
    CoET: ['Chemical and Process Engineering', 'Electrical Engineering', 'Mechanical and Industrial Engineering', 'Structural and Construction Engineering', 'Transportation and Geotechnical Engineering', 'Water Resources Engineering'],
    CoNAS: ['Zoology and Wildlife Conservation', 'Molecular Biology and Biotechnology', 'Botany', 'Chemistry', 'Mathematics', 'Physics'],
    CoICT: ['Computer Science and Engineering', 'Electronics and Telecommunications Engineering'],
    SoMG: ['Geosciences', 'Mining and Mineral Processing Engineering', 'Petroleum Science and Engineering'],
    UDBS: ['Accounting', 'Finance', 'General Management', 'Marketing'],
    SoED: ['Educational Foundations, Management and Lifelong Learning', 'Educational Psychology and Curriculum Studies', 'Physical Education and Sport Sciences'],
    UDSoL: ['Public Law', 'Private Law', 'Economic Law'],
    UDSE: ['Economics', 'Applied Economics'],
    IKS: ['Kiswahili Language and Linguistics (ILUKII)', 'Literature, Communication and Publishing (IFAMU)'],
    IMS: ['Marine and Coastal Resources Management', 'Marine Technology and Innovation'],
    DUCE: ['Educational Foundations, Management and Lifelong Learning', 'Educational Psychology and Curriculum Studies', 'Economics and Geography', 'History, Political Science and Development Studies', 'Languages and Communication Skills', 'Biology', 'Chemistry', 'Mathematics', 'Physics']
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
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
    acceptTerms: [false, Validators.requiredTrue]
  });

  constructor() {
    this.collegeDepartments['SoAF'] = ['Aquatic Sciences and Fisheries Technology'];
    this.collegeDepartments['SJMC'] = ['Journalism', 'Mass Communication', 'Public Relations and Advertising'];
    this.collegeDepartments['IDS'] = ['Development Studies'];
    this.collegeDepartments['MUCE'] = ['Educational Foundations', 'Languages and Literature', 'Mathematics, Science and Technical Education', 'Social Sciences'];
    this.collegeDepartments['MCHAS'] = ['Medicine', 'Dental Surgery', 'Health and Allied Sciences'];
    this.collegeDepartments['UDSM-MRI'] = ['Geology and Mineral Exploration', 'Petroleum Geosciences', 'Mining Engineering', 'Mineral Processing Engineering', 'Environmental Engineering and Management in Mines', 'Land and Mine Surveying'];

    this.form.controls.role.valueChanges.subscribe(() => this.updateDepartmentValidators());
  }

  get isDepartmentStaff(): boolean {
    return this.form.controls.role.value === 'Department';
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
      college: this.isDepartmentStaff ? value.college : 'Administration'
    };

    this.isLoading = true;
    this.authService.register(userData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = response.message || 'Registration successful!';

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
      }
    });
  }

  private updateDepartmentValidators(): void {
    const validators = this.isDepartmentStaff ? [Validators.required] : [];
    this.form.controls.college.setValidators(validators);
    this.form.controls.department.setValidators(validators);

    if (!this.isDepartmentStaff) {
      this.form.controls.college.setValue('');
      this.form.controls.department.setValue('');
    }

    this.form.controls.college.updateValueAndValidity({ emitEvent: false });
    this.form.controls.department.updateValueAndValidity({ emitEvent: false });
  }

  // In staff-register.component.ts - Update the redirectPathFor method

  private redirectPathFor(role: UserRole): string {
    const map: Record<UserRole, string> = {
      Student: '/dashboard',
      Convocation: '/convocation/dashboard',  // Redirects to the dashboard
      'Games Coach': '/games_coach',
      'Hall Warden': '/hall_warden',
      USAB: '/usab',
      DARUSO: '/daruso',
      Library: '/dashboard/library',
      'Dean of Students': '/dean_of_students',
      'Smart Card': '/smart_card',
      Department: '/dashboard/department',
      Finance: '/dashboard/finance',
      ICT: '/dashboard/ict',
      'Academic Staff': '/dashboard/academic',
      Administrator: '/dashboard/admin',
      Principal: '/principal'
    };
    return map[role] ?? '/dashboard';
  }
}
