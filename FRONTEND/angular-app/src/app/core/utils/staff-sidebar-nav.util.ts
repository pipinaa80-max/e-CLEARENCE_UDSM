import { UserRole } from '../models/user.model';

export interface StaffSidebarNavItem {
  label: string;
  icon: string;
  route: string;
  queryParams?: Record<string, string>;
}

export interface StaffPortalMeta {
  title: string;
  subtitle: string;
  dashboardLabel: string;
}

export function getStaffDashboardRoute(role?: UserRole | string | null): string {
  switch (role) {
    case 'DUS Examination Office':
    case 'DUS Secretary':
      return '/dashboard/dus-secretary';
    case 'Station Secretary':
      return '/dashboard/station-secretary';
    case 'Director of Undergraduate Studies':
      return '/dashboard/director-undergraduate-studies';
    case 'Director of Postgraduate Studies':
      return '/dashboard/director-postgraduate-studies';
    case 'Administrator':
    case 'SUPERUSER':
      return '/dashboard/admin';
    case 'Finance':
      return '/dashboard/finance';
    case 'Convocation':
      return '/dashboard/convocation';
    case 'Library':
      return '/dashboard/library';
    case 'Department':
      return '/department/dashboard';
    case 'Principal':
      return '/dashboard/principal';
    case 'Academic Staff':
      return '/dashboard/academic';
    case 'Lecturer':
      return '/dashboard/lecturer';
    case 'Games Coach':
      return '/dashboard/games-coach';
    case 'Hall Warden':
      return '/dashboard/hall-warden';
    case 'USAB':
      return '/dashboard/usab';
    case 'DARUSO':
      return '/dashboard/daruso';
    case 'Dean of Students':
      return '/dashboard/dean-of-students';
    case 'Smart Card':
      return '/dashboard/smart-card';
    case 'Workshop':
      return '/dashboard/workshop';
    case 'Laboratory':
      return '/dashboard/laboratory';
    case 'Supervisor':
      return '/dashboard/supervisor';
    case 'Student':
    default:
      return '/dashboard';
  }
}

export function getStaffPortalMeta(role?: UserRole | string | null): StaffPortalMeta {
  if (!role || role === 'Student') {
    return {
      title: 'STUDENT PORTAL',
      subtitle: 'University of Dar es Salaam',
      dashboardLabel: 'Dashboard'
    };
  }
  switch (role) {
    case 'Director of Undergraduate Studies':
      return {
        title: 'DUS DIRECTORATE',
        subtitle: 'Undergraduate Analytics & Oversight',
        dashboardLabel: 'DUS Dashboard'
      };
    case 'Director of Postgraduate Studies':
      return {
        title: 'DPGS DIRECTORATE',
        subtitle: 'Postgraduate Clearance & Transcripts',
        dashboardLabel: 'DPGS Dashboard'
      };
    case 'DUS Examination Office':
    case 'DUS Secretary':
      return {
        title: 'DUS EXAMINATION OFFICE',
        subtitle: 'Directorate of Undergraduate Studies',
        dashboardLabel: 'Examination & Dispatch'
      };
    case 'Station Secretary':
      return {
        title: 'STATION DUS PORTAL',
        subtitle: 'Receiving & Handover Hub',
        dashboardLabel: 'Station Vault & Intake'
      };
    case 'Administrator':
    case 'SUPERUSER':
      return {
        title: 'ADMIN PANEL',
        subtitle: 'University of Dar es Salaam',
        dashboardLabel: 'Admin Dashboard'
      };
    default:
      return {
        title: `${String(role).toUpperCase()} PORTAL`,
        subtitle: `${role} Office`,
        dashboardLabel: 'Dashboard'
      };
  }
}

export function getStaffSidebarNavItems(user?: any): StaffSidebarNavItem[] {
  const role: string | undefined = user?.role;
  const route = getStaffDashboardRoute(role);

  switch (role) {
    case 'Director of Undergraduate Studies':
    case 'Director of Postgraduate Studies':
      return [
        { label: 'Analytics & Overview', icon: 'bi-bar-chart-line-fill', route, queryParams: { tab: 'overview' } },
        { label: 'Clearance Process Flow', icon: 'bi-diagram-3-fill', route, queryParams: { tab: 'process' } },
        { label: 'Corresponding Offices', icon: 'bi-grid-fill', route, queryParams: { tab: 'offices' } },
        { label: 'Student Clearance Tracker', icon: 'bi-people-fill', route, queryParams: { tab: 'students' } },
        { label: 'Transcript Dispatch Ledger', icon: 'bi-journal-bookmark-fill', route, queryParams: { tab: 'transcripts' } },
        { label: 'Collection Stations', icon: 'bi-geo-alt-fill', route, queryParams: { tab: 'stations' } }
      ];

    case 'Administrator':
    case 'SUPERUSER':
      return [
        { label: 'User Management', icon: 'bi-people-fill', route, queryParams: { tab: 'users' } },
        { label: 'Clearance Requests', icon: 'bi-file-earmark-check-fill', route, queryParams: { tab: 'clearance' } },
        { label: 'Data Upload', icon: 'bi-cloud-arrow-up-fill', route, queryParams: { tab: 'upload' } },
        { label: 'Institutional Dashboards', icon: 'bi-speedometer2', route, queryParams: { tab: 'dashboards' } },
        { label: 'Institutional Theme', icon: 'bi-palette-fill', route, queryParams: { tab: 'theme' } },
        { label: 'Academic Awards', icon: 'bi-award-fill', route, queryParams: { tab: 'awards' } },
        { label: 'Sponsors & Funding', icon: 'bi-cash-stack', route, queryParams: { tab: 'sponsors' } }
      ];

    case 'DUS Examination Office':
    case 'DUS Secretary':
      return [
        { label: 'Certificate Verification', icon: 'bi-patch-check-fill', route, queryParams: { tab: 'verification' } },
        { label: 'Consignment Dispatch', icon: 'bi-grid-fill', route, queryParams: { tab: 'dispatch' } },
        { label: 'Regional Hubs Network', icon: 'bi-diagram-3-fill', route, queryParams: { tab: 'pipeline' } },
        { label: 'Station Personnel', icon: 'bi-people-fill', route, queryParams: { tab: 'personnel' } }
      ];

    case 'Station Secretary':
      return [
        { label: 'Station Desk & Vault', icon: 'bi-safe-fill', route, queryParams: { tab: 'ALL' } },
        { label: 'Incoming Shipments', icon: 'bi-truck', route, queryParams: { tab: 'IN_TRANSIT' } },
        { label: 'Vault Custody', icon: 'bi-shield-lock-fill', route, queryParams: { tab: 'IN_VAULT' } },
        { label: 'Release Vouchers', icon: 'bi-clipboard-check-fill', route, queryParams: { tab: 'COLLECTED' } }
      ];

    case 'Convocation':
      return [
        { label: 'All Submissions', icon: 'bi-grid-1x2-fill', route, queryParams: { tab: 'all' } },
        { label: 'Pending Review', icon: 'bi-hourglass-split', route, queryParams: { tab: 'pending' } },
        { label: 'Analytics', icon: 'bi-bar-chart-line-fill', route, queryParams: { tab: 'analytics' } }
      ];

    case 'Finance':
      return [
        { label: 'Clearance Requests', icon: 'bi-grid-1x2-fill', route, queryParams: { tab: 'requests' } },
        { label: 'Transcript Payments', icon: 'bi-receipt-cutoff', route, queryParams: { tab: 'transcript-payments' } },
        { label: 'Financial Analytics', icon: 'bi-bar-chart-line-fill', route, queryParams: { tab: 'analytics' } }
      ];

    case 'DARUSO':
      return [
        { label: 'Clearance Requests', icon: 'bi-grid-1x2-fill', route, queryParams: { tab: 'requests' } },
        { label: 'Analytics', icon: 'bi-bar-chart-line-fill', route, queryParams: { tab: 'analytics' } },
        { label: 'Student Guilds', icon: 'bi-people-fill', route, queryParams: { tab: 'guilds' } }
      ];

    case 'Library':
      return [
        { label: 'Clearance Requests', icon: 'bi-grid-1x2-fill', route, queryParams: { tab: 'requests' } },
        { label: 'Analytics', icon: 'bi-bar-chart-line-fill', route, queryParams: { tab: 'analytics' } },
        { label: 'Library Sections', icon: 'bi-book-half', route, queryParams: { tab: 'sections' } }
      ];

    case 'USAB':
      return [
        { label: 'Clearance Requests', icon: 'bi-grid-1x2-fill', route, queryParams: { tab: 'requests' } },
        { label: 'Analytics', icon: 'bi-bar-chart-line-fill', route, queryParams: { tab: 'analytics' } },
        { label: 'Hostel Directory', icon: 'bi-buildings-fill', route, queryParams: { tab: 'hostels' } }
      ];

    case 'Smart Card':
      return [
        { label: 'Clearance Requests', icon: 'bi-grid-1x2-fill', route, queryParams: { tab: 'requests' } },
        { label: 'Analytics', icon: 'bi-bar-chart-line-fill', route, queryParams: { tab: 'analytics' } },
        { label: 'Card Desks', icon: 'bi-credit-card-2-front-fill', route, queryParams: { tab: 'desks' } }
      ];

    case 'Hall Warden':
      return [
        { label: 'Clearance Requests', icon: 'bi-grid-1x2-fill', route, queryParams: { tab: 'requests' } },
        { label: 'Analytics', icon: 'bi-bar-chart-line-fill', route, queryParams: { tab: 'analytics' } },
        { label: 'Halls & Hostels', icon: 'bi-house-door-fill', route, queryParams: { tab: 'halls' } }
      ];

    case 'Games Coach':
      return [
        { label: 'Clearance Requests', icon: 'bi-grid-1x2-fill', route, queryParams: { tab: 'requests' } },
        { label: 'Analytics', icon: 'bi-bar-chart-line-fill', route, queryParams: { tab: 'analytics' } },
        { label: 'Sports Facilities', icon: 'bi-trophy-fill', route, queryParams: { tab: 'facilities' } }
      ];

    case 'Department':
      return [
        { label: 'Clearance Requests', icon: 'bi-grid-1x2-fill', route, queryParams: { tab: 'requests' } },
        { label: 'Department Analytics', icon: 'bi-bar-chart-line-fill', route, queryParams: { tab: 'analytics' } }
      ];

    case 'Principal':
      return [
        { label: 'Clearance Requests', icon: 'bi-grid-1x2-fill', route, queryParams: { tab: 'requests' } },
        { label: 'College Analytics', icon: 'bi-bar-chart-line-fill', route, queryParams: { tab: 'analytics' } }
      ];

    case 'Dean of Students':
    case 'Workshop':
    case 'Laboratory':
      return [
        { label: 'Clearance Requests', icon: 'bi-grid-1x2-fill', route, queryParams: { tab: 'requests' } },
        { label: 'Analytics', icon: 'bi-bar-chart-line-fill', route, queryParams: { tab: 'analytics' } }
      ];

    case 'Academic Staff':
      return [
        { label: 'Department Liabilities', icon: 'bi-shield-exclamation', route, queryParams: { tab: 'liabilities' } },
        { label: 'Clearance Workflow Guide', icon: 'bi-diagram-3-fill', route, queryParams: { tab: 'guidance' } }
      ];

    case 'Lecturer':
      return [
        { label: 'Debt Register', icon: 'bi-journal-check', route }
      ];

    case 'Supervisor':
      return [
        { label: 'Postgraduate Clearance', icon: 'bi-mortarboard-fill', route }
      ];

    default:
      return [
        { label: 'Dashboard', icon: 'bi-grid-1x2-fill', route }
      ];
  }
}
