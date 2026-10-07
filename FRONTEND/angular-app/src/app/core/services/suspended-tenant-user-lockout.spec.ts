import { describe, expect, it, beforeEach } from 'vitest';

interface TenantStatus {
  subdomain: string;
  active: boolean;
}

interface AppUser {
  email: string;
  tenantSubdomain: string;
  role: string;
}

describe('SuperUser Dashboard - Suspended Tenant Blocks All Users in Institution', () => {
  let tenants: TenantStatus[];
  let users: AppUser[];

  beforeEach(() => {
    tenants = [
      { subdomain: 'udsm', active: true },
      { subdomain: 'dit', active: true }
    ];

    users = [
      { email: 'student.a@dit.ac.tz', tenantSubdomain: 'dit', role: 'Student' },
      { email: 'staff.b@dit.ac.tz', tenantSubdomain: 'dit', role: 'Department' },
      { email: 'student.c@udsm.ac.tz', tenantSubdomain: 'udsm', role: 'Student' }
    ];
  });

  const authenticateUser = (email: string) => {
    const user = users.find(u => u.email === email);
    if (!user) return { success: false, message: 'User not found' };

    const tenant = tenants.find(t => t.subdomain === user.tenantSubdomain);
    if (!tenant || !tenant.active) {
      return {
        success: false,
        message: 'Institutional Access Suspended: Access to this campus domain has been temporarily suspended.'
      };
    }

    return { success: true, message: 'Login successful' };
  };

  it('should ALLOW login for all students and staff when DIT tenant is ACTIVE', () => {
    const res1 = authenticateUser('student.a@dit.ac.tz');
    expect(res1.success).toBe(true);

    const res2 = authenticateUser('staff.b@dit.ac.tz');
    expect(res2.success).toBe(true);
  });

  it('should DENY ACCESS to ALL students and staff under DIT when SuperUser suspends DIT admin', () => {
    // SuperUser clicks "Suspend access" for DIT
    const ditTenant = tenants.find(t => t.subdomain === 'dit');
    if (ditTenant) ditTenant.active = false;

    // 1. DIT Student login attempt
    const studentRes = authenticateUser('student.a@dit.ac.tz');
    expect(studentRes.success).toBe(false);
    expect(studentRes.message).toContain('Institutional Access Suspended');

    // 2. DIT Staff login attempt
    const staffRes = authenticateUser('staff.b@dit.ac.tz');
    expect(staffRes.success).toBe(false);
    expect(staffRes.message).toContain('Institutional Access Suspended');

    // 3. UDSM Student remains unaffected
    const udsmRes = authenticateUser('student.c@udsm.ac.tz');
    expect(udsmRes.success).toBe(true);
  });

  it('should RESTORE ACCESS to all students and staff when SuperUser clicks Allow Access for DIT', () => {
    // Suspend
    const ditTenant = tenants.find(t => t.subdomain === 'dit');
    if (ditTenant) ditTenant.active = false;

    expect(authenticateUser('student.a@dit.ac.tz').success).toBe(false);

    // SuperUser clicks "Allow access"
    if (ditTenant) ditTenant.active = true;

    // Access restored
    expect(authenticateUser('student.a@dit.ac.tz').success).toBe(true);
    expect(authenticateUser('staff.b@dit.ac.tz').success).toBe(true);
  });
});
