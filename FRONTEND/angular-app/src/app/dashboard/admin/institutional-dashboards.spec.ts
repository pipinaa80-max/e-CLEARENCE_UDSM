import { describe, expect, it, beforeEach } from 'vitest';

interface ProjectDashboard {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

describe('Admin Dashboard - Institutional Dashboards Management', () => {
  let dashboards: ProjectDashboard[];

  const defaultDashboards: ProjectDashboard[] = [
    { id: 'academic-staff', name: 'Academic Staff', description: 'Academic Staff clearance office', enabled: true },
    { id: 'administrator', name: 'Administrator', description: 'Administrator clearance office', enabled: true },
    { id: 'convocation', name: 'Convocation', description: 'Convocation clearance office', enabled: true },
    { id: 'finance', name: 'Finance', description: 'Finance clearance office', enabled: true }
  ];

  beforeEach(() => {
    dashboards = [...defaultDashboards.map(d => ({ ...d }))];
  });

  it('should load default institutional dashboards', () => {
    expect(dashboards.length).toBe(4);
    expect(dashboards[0].id).toBe('academic-staff');
    expect(dashboards[2].id).toBe('convocation');
  });

  it('should add a new institutional dashboard successfully', () => {
    const newDash: ProjectDashboard = {
      id: 'alumni-office',
      name: 'Alumni Office',
      description: 'Alumni relations & clearance office',
      enabled: true
    };

    dashboards.push(newDash);

    expect(dashboards.length).toBe(5);
    const added = dashboards.find(d => d.id === 'alumni-office');
    expect(added).toBeDefined();
    expect(added?.name).toBe('Alumni Office');
  });

  it('should update an existing dashboard name and description', () => {
    const target = dashboards.find(d => d.id === 'finance');
    expect(target).toBeDefined();

    if (target) {
      target.name = 'Finance & Accounts';
      target.description = 'Updated finance office description';
      target.enabled = false;
    }

    const updated = dashboards.find(d => d.id === 'finance');
    expect(updated?.name).toBe('Finance & Accounts');
    expect(updated?.enabled).toBe(false);
  });

  it('should delete a dashboard by ID', () => {
    const initialCount = dashboards.length;
    dashboards = dashboards.filter(d => d.id !== 'academic-staff');

    expect(dashboards.length).toBe(initialCount - 1);
    expect(dashboards.find(d => d.id === 'academic-staff')).toBeUndefined();
  });
});
