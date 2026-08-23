// app.routes.ts
import { Routes } from '@angular/router';

import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { StudentDashboard } from './dashboard/student/student';
import { LibraryDashboard } from './clearenceapproval/library/library';
import { DepartmentStatusComponent } from './clearenceapproval/department/department';
import { FinanceDashboard } from './clearenceapproval/finance/finance';
import { IctDashboard } from './dashboard/ict/ict';
import { AcademicDashboard } from './dashboard/academic/academic';
import { AdminDashboard } from './dashboard/admin/admin';
import { ClearanceRequestComponent } from './clearance/request/request';
import { ClearanceStatusComponent } from './clearance/status/status';
import { ClearanceConfirmationComponent } from './clearance/confirmation/confirmation';
import { ClearanceHistoryComponent } from './clearance/history/history';
import { ClearanceReportComponent } from './clearance/report/report';
import { DocumentsListComponent } from './documents/documents-list/documents-list';
import { NotificationListComponent } from './notifications/notifications';
import { ProfileComponent } from './profile/profile';
import { Landing } from './landing/landing';
import { SignupOptions } from './auth/signup-options/signup-options';
import { StaffRegister } from './auth/staff-register/staff-register';
import { ConvocationComponent } from './clearenceapproval/convocation/convocation';
import { GamesCoachComponent } from './clearenceapproval/games_coach/games_coach';
import { HallWardenComponent } from './clearenceapproval/hall_warden/hall_warden';
import { UsabComponent } from './clearenceapproval/usab/usab';
import { DarusoComponent } from './clearenceapproval/daruso/daruso';
import { DeanOfStudentsComponent } from './clearenceapproval/dean_of_students/dean_of_students';
import { SmartCardComponent } from './clearenceapproval/smart_card/smart_card';
import { PrincipalComponent } from './clearenceapproval/principal/principal';
import { ConvocationDashboardComponent } from './dashboard/convocation-dashboard/convocation-dashboard.component';
import { DepartmentReviewComponent } from './dashboard/department-review/department-review.component';
import {DepartmentOfficerComponent} from "./dashboard/Department-officer/department-officer.component";

export const routes: Routes = [
  // Public Routes
  { path: '', component: Landing },
  { path: 'login', component: Login },
  { path: 'signup-options', component: SignupOptions },
  { path: 'register', component: Register },
  { path: 'staff-register', component: StaffRegister },

  // Student Dashboard
  { path: 'dashboard', component: StudentDashboard },

  // Office Dashboards
  { path: 'dashboard/library', component: LibraryDashboard },
  { path: 'dashboard/department', component: DepartmentStatusComponent },
  { path: 'dashboard/finance', component: FinanceDashboard },
  { path: 'dashboard/ict', component: IctDashboard },
  { path: 'dashboard/academic', component: AcademicDashboard },
  { path: 'dashboard/admin', component: AdminDashboard },

  // Clearance Routes
  { path: 'clearance/request', component: ClearanceRequestComponent },
  { path: 'clearance/status', component: ClearanceStatusComponent },
  { path: 'clearance/confirmation', component: ClearanceConfirmationComponent },
  { path: 'clearance/history', component: ClearanceHistoryComponent },
  { path: 'clearance/report', component: ClearanceReportComponent },

  // Documents & Notifications
  { path: 'documents', component: DocumentsListComponent },
  { path: 'notifications', component: NotificationListComponent },
  { path: 'profile', component: ProfileComponent },

  // Clearance Approval Offices
  { path: 'convocation', component: ConvocationComponent },
  { path: 'games_coach', component: GamesCoachComponent },
  { path: 'hall_warden', component: HallWardenComponent },
  { path: 'usab', component: UsabComponent },
  { path: 'daruso', component: DarusoComponent },
  { path: 'dean_of_students', component: DeanOfStudentsComponent },
  { path: 'smart_card', component: SmartCardComponent },
  { path: 'principal', component: PrincipalComponent },

  // Department Officer Routes
  { path: 'department/dashboard', component: DepartmentOfficerComponent },
  { path: 'department/review/:id', component: DepartmentReviewComponent },

  // Convocation Staff Routes
  { path: 'convocation/dashboard', component: ConvocationDashboardComponent }
];