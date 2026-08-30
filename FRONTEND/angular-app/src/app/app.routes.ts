// app.routes.ts
import { Routes } from '@angular/router';

import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { StudentDashboard } from './dashboard/student/student';
import { LibraryDashboard } from './dashboard/library/library';
import { FinanceDashboard } from './dashboard/finance/finance';
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
import { ForgotPassword } from './auth/forgot-password/forgot-password';
import { ResetPassword } from './auth/reset-password/reset-password';
import { ConvocationComponent } from './clearenceapproval/convocation/convocation';
import { GamesCoachComponent } from './dashboard/games_coach/games_coach';
import { HallWardenComponent } from './dashboard/hall_warden/hall_warden';
import { UsabComponent } from './dashboard/usab/usab';
import { DarusoComponent } from './dashboard/daruso/daruso';
import { DeanOfStudentsComponent } from './dashboard/dean_of_students/dean_of_students';
import { SmartCardComponent } from './dashboard/smart_card/smart_card';
import { PrincipalComponent } from './dashboard/principal/principal';
import { WorkshopComponent } from './dashboard/workshop/workshop';
import { LaboratoryComponent } from './dashboard/laboratory/laboratory';
import { ConvocationDashboardComponent } from './dashboard/convocation-dashboard/convocation-dashboard.component';
import { DepartmentReviewComponent } from './dashboard/department-review/department-review.component';
import { DepartmentOfficerComponent } from "./dashboard/Department-officer/department-officer.component";
import { TranscriptComponent } from './transcript/transcript';
import { TranscriptPaymentComponent } from './transcript/payment';
import { TranscriptFinancePaymentComponent } from './transcript/finance-payment';
import { TranscriptDocumentsComponent } from './documents/transcript-documents/transcript-documents';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // Public Routes
  { path: '', component: Landing },
  { path: 'login', component: Login },
  { path: 'signup-options', component: SignupOptions },
  { path: 'register', component: Register },
  { path: 'staff-register', component: StaffRegister },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'reset-password', component: ResetPassword },

  // Student Dashboard
  {
    path: 'dashboard',
    component: StudentDashboard,
    canActivate: [authGuard, roleGuard(['Student'])]
  },

  // Office Dashboards
  {
    path: 'dashboard/library',
    component: LibraryDashboard,
    canActivate: [authGuard, roleGuard(['Library'])]
  },
  {
    path: 'dashboard/finance',
    component: FinanceDashboard,
    canActivate: [authGuard, roleGuard(['Finance'])]
  },
  {
    path: 'dashboard/principal',
    component: PrincipalComponent,
    canActivate: [authGuard, roleGuard(['Principal'])]
  },
  {
    path: 'dashboard/ict',
    component: IctDashboard,
    canActivate: [authGuard, roleGuard(['ICT'])]
  },
  {
    path: 'dashboard/academic',
    component: AcademicDashboard,
    canActivate: [authGuard, roleGuard(['Academic Staff'])]
  },
  {
    path: 'dashboard/admin',
    component: AdminDashboard,
    canActivate: [authGuard, roleGuard(['Administrator'])]
  },
  {
    path: 'dashboard/games-coach',
    component: GamesCoachComponent,
    canActivate: [authGuard, roleGuard(['Games Coach'])]
  },
  {
    path: 'dashboard/hall-warden',
    component: HallWardenComponent,
    canActivate: [authGuard, roleGuard(['Hall Warden'])]
  },
  {
    path: 'dashboard/usab',
    component: UsabComponent,
    canActivate: [authGuard, roleGuard(['USAB'])]
  },
  {
    path: 'dashboard/daruso',
    component: DarusoComponent,
    canActivate: [authGuard, roleGuard(['DARUSO'])]
  },
  {
    path: 'dashboard/dean-of-students',
    component: DeanOfStudentsComponent,
    canActivate: [authGuard, roleGuard(['Dean of Students'])]
  },
  {
    path: 'dashboard/smart-card',
    component: SmartCardComponent,
    canActivate: [authGuard, roleGuard(['Smart Card'])]
  },
  {
    path: 'dashboard/workshop',
    component: WorkshopComponent,
    canActivate: [authGuard, roleGuard(['Workshop'])]
  },
  {
    path: 'dashboard/laboratory',
    component: LaboratoryComponent,
    canActivate: [authGuard, roleGuard(['Laboratory'])]
  },

  // Clearance Routes
  { path: 'clearance/request', component: ClearanceRequestComponent, canActivate: [authGuard] },
  { path: 'clearance/status', component: ClearanceStatusComponent, canActivate: [authGuard] },
  { path: 'clearance/confirmation', component: ClearanceConfirmationComponent, canActivate: [authGuard] },
  { path: 'clearance/history', component: ClearanceHistoryComponent, canActivate: [authGuard] },
  { path: 'clearance/report', component: ClearanceReportComponent, canActivate: [authGuard] },

  { path: 'transcript', component: TranscriptComponent, canActivate: [authGuard] },
  { path: 'transcript/payment', component: TranscriptPaymentComponent, canActivate: [authGuard] },
  { path: 'documents/transcript', component: TranscriptDocumentsComponent, canActivate: [authGuard] },
  { path: 'dashboard/finance/transcript-payments', component: TranscriptFinancePaymentComponent, canActivate: [authGuard, roleGuard(['Finance'])] },

  // Documents & Notifications
  { path: 'documents', component: DocumentsListComponent, canActivate: [authGuard] },
  { path: 'notifications', component: NotificationListComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },

  // Clearance Approval Offices
  { path: 'convocation', component: ConvocationComponent, canActivate: [authGuard, roleGuard(['Convocation', 'Student'])] },
  { path: 'games_coach', component: GamesCoachComponent, canActivate: [authGuard, roleGuard(['Games Coach'])] },
  { path: 'hall_warden', component: HallWardenComponent, canActivate: [authGuard, roleGuard(['Hall Warden'])] },
  { path: 'usab', component: UsabComponent, canActivate: [authGuard, roleGuard(['USAB'])] },
  { path: 'daruso', component: DarusoComponent, canActivate: [authGuard, roleGuard(['DARUSO'])] },
  { path: 'dean_of_students', component: DeanOfStudentsComponent, canActivate: [authGuard, roleGuard(['Dean of Students'])] },
  { path: 'smart_card', component: SmartCardComponent, canActivate: [authGuard, roleGuard(['Smart Card'])] },
  { path: 'principal', component: PrincipalComponent, canActivate: [authGuard, roleGuard(['Principal'])] },

  // Department Officer Routes
  { path: 'department/dashboard', component: DepartmentOfficerComponent, canActivate: [authGuard, roleGuard(['Department'])] },
  { path: 'department/review/:id', component: DepartmentReviewComponent, canActivate: [authGuard, roleGuard(['Department'])] },

  // Convocation Staff Routes
  { path: 'convocation/dashboard', component: ConvocationDashboardComponent, canActivate: [authGuard, roleGuard(['Convocation'])] }
];
