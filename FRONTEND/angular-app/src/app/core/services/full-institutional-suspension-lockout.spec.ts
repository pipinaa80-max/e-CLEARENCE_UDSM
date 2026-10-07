import { describe, expect, it, beforeEach } from 'vitest';

interface CampusUser {
  id: string;
  name: string;
  email: string;
  role: string;
  projectId: string;
  active: boolean;
}

describe('SuperUser Dashboard - Full Institutional Suspension Lockout (All Staff & All Dashboards)', () => {
  let userDatabase: CampusUser[];

  beforeEach(() => {
    userDatabase = [
      { id: 'usr-udom-admin', name: 'UDOM Admin', email: 'admin@udom.ac.tz', role: 'ADMINISTRATOR', projectId: 'project-udom', active: true },
      { id: 'usr-udom-student', name: 'UDOM Student 1', email: 'student1@udom.ac.tz', role: 'STUDENT', projectId: 'project-udom', active: true },
      { id: 'usr-udom-library', name: 'UDOM Library Officer', email: 'library@udom.ac.tz', role: 'LIBRARY_OFFICER', projectId: 'project-udom', active: true },
      { id: 'usr-udom-finance', name: 'UDOM Finance Officer', email: 'finance@udom.ac.tz', role: 'FINANCE_OFFICER', projectId: 'project-udom', active: true },
      { id: 'usr-udsm-student', name: 'UDSM Student 2', email: 'student2@udsm.ac.tz', role: 'STUDENT', projectId: 'project-udsm', active: true }
    ];
  });

  const toggleInstitutionalAccess = (projectId: string, activeStatus: boolean) => {
    userDatabase.forEach(u => {
      if (u.projectId === projectId) {
        u.active = activeStatus;
      }
    });
  };

  const attemptLoginOrDashboardAccess = (email: string) => {
    const user = userDatabase.find(u => u.email === email);
    if (!user) return { success: false, reason: 'User not found' };

    if (!user.active) {
      return {
        success: false,
        reason: 'Institutional Access Suspended: Access to all institutional staff and dashboards has been suspended.'
      };
    }

    return { success: true, reason: 'Access Granted' };
  };

  it('ALL UDOM users (admin, students, library, finance) should have active access initially', () => {
    expect(attemptLoginOrDashboardAccess('admin@udom.ac.tz').success).toBe(true);
    expect(attemptLoginOrDashboardAccess('student1@udom.ac.tz').success).toBe(true);
    expect(attemptLoginOrDashboardAccess('library@udom.ac.tz').success).toBe(true);
    expect(attemptLoginOrDashboardAccess('finance@udom.ac.tz').success).toBe(true);
  });

  it('SUSPEND ACCESS: should DENY ACCESS to ALL staff, students, and dashboards under UDOM when suspended', () => {
    // SuperUser clicks "Suspend access" for UDOM
    toggleInstitutionalAccess('project-udom', false);

    // 1. Admin blocked
    expect(attemptLoginOrDashboardAccess('admin@udom.ac.tz').success).toBe(false);

    // 2. Student blocked
    expect(attemptLoginOrDashboardAccess('student1@udom.ac.tz').success).toBe(false);

    // 3. Library officer / dashboard blocked
    expect(attemptLoginOrDashboardAccess('library@udom.ac.tz').success).toBe(false);

    // 4. Finance officer / dashboard blocked
    expect(attemptLoginOrDashboardAccess('finance@udom.ac.tz').success).toBe(false);

    // 5. UDSM users remain 100% unaffected
    expect(attemptLoginOrDashboardAccess('student2@udsm.ac.tz').success).toBe(true);
  });

  it('ALLOW ACCESS: should RESTORE ACCESS to ALL staff, students, and dashboards under UDOM when re-enabled', () => {
    toggleInstitutionalAccess('project-udom', false);
    expect(attemptLoginOrDashboardAccess('student1@udom.ac.tz').success).toBe(false);

    // SuperUser clicks "Allow access" for UDOM
    toggleInstitutionalAccess('project-udom', true);

    expect(attemptLoginOrDashboardAccess('admin@udom.ac.tz').success).toBe(true);
    expect(attemptLoginOrDashboardAccess('student1@udom.ac.tz').success).toBe(true);
    expect(attemptLoginOrDashboardAccess('library@udom.ac.tz').success).toBe(true);
    expect(attemptLoginOrDashboardAccess('finance@udom.ac.tz').success).toBe(true);
  });
});
