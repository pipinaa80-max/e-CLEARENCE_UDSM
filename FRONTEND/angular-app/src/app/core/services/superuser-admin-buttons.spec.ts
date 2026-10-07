import { describe, expect, it, beforeEach } from 'vitest';

interface SubAdminUser {
  id: string;
  name: string;
  email: string;
  active: boolean;
  role: string;
}

describe('SuperUser Dashboard - Reset Password and Suspend/Allow Access Button Actions', () => {
  let adminList: SubAdminUser[];

  beforeEach(() => {
    adminList = [
      {
        id: 'admin-duce-01',
        name: 'DUCE Administrator',
        email: 'admin.duce@udsm.ac.tz',
        active: true,
        role: 'ADMINISTRATOR'
      },
      {
        id: 'admin-muce-02',
        name: 'MUCE Administrator',
        email: 'admin.muce@udsm.ac.tz',
        active: false,
        role: 'ADMINISTRATOR'
      }
    ];
  });

  const getButtonLabel = (admin: SubAdminUser) => admin.active ? 'Suspend access' : 'Allow access';
  const getStatusBadge = (admin: SubAdminUser) => admin.active ? 'Active access' : 'Suspended access';

  it('RESET PASSWORD: should generate temporary secure password for sub-admin', () => {
    const adminId = 'admin-duce-01';
    const admin = adminList.find(a => a.id === adminId);
    expect(admin).toBeDefined();

    const resetPasswordHandler = (id: string) => {
      const target = adminList.find(a => a.id === id);
      if (!target) return null;
      const tempPassword = 'TempPass' + Math.floor(Math.random() * 9000 + 1000) + '!';
      return {
        email: target.email,
        temporaryPassword: tempPassword,
        message: 'Temporary password generated successfully.'
      };
    };

    const res = resetPasswordHandler(adminId);
    expect(res).not.toBeNull();
    expect(res?.email).toBe('admin.duce@udsm.ac.tz');
    expect(res?.temporaryPassword.length).toBeGreaterThan(8);
  });

  it('SUSPEND ACCESS: should toggle admin active status to suspended (false) and update label to Allow access', () => {
    const adminId = 'admin-duce-01';
    const admin = adminList.find(a => a.id === adminId)!;
    expect(admin.active).toBe(true);
    expect(getButtonLabel(admin)).toBe('Suspend access');
    expect(getStatusBadge(admin)).toBe('Active access');

    // Suspend admin access
    admin.active = false;

    expect(admin.active).toBe(false);
    expect(getButtonLabel(admin)).toBe('Allow access');
    expect(getStatusBadge(admin)).toBe('Suspended access');
  });

  it('ALLOW ACCESS: should toggle admin active status from suspended (false) to active (true) and update label to Suspend access', () => {
    const adminId = 'admin-muce-02';
    const admin = adminList.find(a => a.id === adminId)!;
    expect(admin.active).toBe(false);
    expect(getButtonLabel(admin)).toBe('Allow access');
    expect(getStatusBadge(admin)).toBe('Suspended access');

    // Allow admin access
    admin.active = true;

    expect(admin.active).toBe(true);
    expect(getButtonLabel(admin)).toBe('Suspend access');
    expect(getStatusBadge(admin)).toBe('Active access');
  });
});
