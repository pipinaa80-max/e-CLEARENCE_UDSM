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
import {DepartmentOfficerComponent} from "./dashboard/Department-officer/department-officer.component";
import { TranscriptComponent } from './transcript/transcript';
import { TranscriptPaymentComponent } from './transcript/payment';
import { TranscriptFinancePaymentComponent } from './transcript/finance-payment';
import { TranscriptDocumentsComponent } from './documents/transcript-documents/transcript-documents';

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
  { path: 'dashboard/finance', component: FinanceDashboard },
  { path: 'dashboard/principal', component: PrincipalComponent },
  { path: 'dashboard/ict', component: IctDashboard },
  { path: 'dashboard/academic', component: AcademicDashboard },
  { path: 'dashboard/admin', component: AdminDashboard },
  { path: 'dashboard/games-coach', component: GamesCoachComponent },
  { path: 'dashboard/hall-warden', component: HallWardenComponent },
  { path: 'dashboard/usab', component: UsabComponent },
  { path: 'dashboard/daruso', component: DarusoComponent },
  { path: 'dashboard/dean-of-students', component: DeanOfStudentsComponent },
  { path: 'dashboard/smart-card', component: SmartCardComponent },
  { path: 'dashboard/workshop', component: WorkshopComponent },
  { path: 'dashboard/laboratory', component: LaboratoryComponent },

  // Clearance Routes
  { path: 'clearance/request', component: ClearanceRequestComponent },
  { path: 'clearance/status', component: ClearanceStatusComponent },
  { path: 'clearance/confirmation', component: ClearanceConfirmationComponent },
  { path: 'clearance/history', component: ClearanceHistoryComponent },
  { path: 'clearance/report', component: ClearanceReportComponent },
  { path: 'transcript', component: TranscriptComponent },
  { path: 'transcript/payment', component: TranscriptPaymentComponent },
  { path: 'documents/transcript', component: TranscriptDocumentsComponent },
  { path: 'dashboard/finance/transcript-payments', component: TranscriptFinancePaymentComponent },

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