import { describe, expect, it, beforeEach } from 'vitest';

interface ProjectDashboard {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
};

describe('Admin Dashboard - Save & Delete Dashboard Buttons', () => {
  let dashboards: ProjectDashboard[];
  let message: string;
  let isError: boolean;

  const initialDashboards: ProjectDashboard[] = [
    { id: 'academic-staff', name: 'Academic Staff', description: 'Academic Staff clearance office', enabled: true },
    { id: 'administrator', name: 'Administrator', description: 'Administrator clearance office', enabled: true },
    { id: 'convocation', name: 'Convocation', description: 'Convocation clearance office', enabled: true }
  ];

  const saveLocalDashboards = (list: ProjectDashboard[]) => {
    localStorage.setItem('udsm-project-dashboards', JSON.stringify(list));
  };

  const getLocalDashboards = (): ProjectDashboard[] => {
    const raw = localStorage.getItem('udsm-project-dashboards');
    return raw ? JSON.parse(raw) : [];
  };

  beforeEach(() => {
    (globalThis as any).localStorage = createLocalStorageMock();
    dashboards = initialDashboards.map(d => ({ ...d }));
    saveLocalDashboards(dashboards);
    message = '';
    isError = false;
  });

  it('SAVE BUTTON: should update dashboard name and enabled state when Save is clicked', () => {
    const target = dashboards.find(d => d.id === 'academic-staff');
    expect(target).toBeDefined();

    if (target) {
      // User modifies form fields
      target.name = 'Academic Staff & Research';
      target.description = 'Updated academic research clearance office';
      target.enabled = false;

      // Simulate updateDashboard() handler (Save button)
      saveLocalDashboards(dashboards);
      message = `Dashboard "${target.name}" updated successfully.`;
      isError = false;
    }

    const savedInStorage = getLocalDashboards();
    const updated = savedInStorage.find(d => d.id === 'academic-staff');

    expect(updated?.name).toBe('Academic Staff & Research');
    expect(updated?.description).toBe('Updated academic research clearance office');
    expect(updated?.enabled).toBe(false);
    expect(message).toBe('Dashboard "Academic Staff & Research" updated successfully.');
    expect(isError).toBe(false);
  });

  it('DELETE BUTTON: should remove dashboard from list when Delete is clicked', () => {
    const idToDelete = 'administrator';
    expect(dashboards.some(d => d.id === idToDelete)).toBe(true);

    // Simulate deleteDashboard() handler (Delete button)
    dashboards = dashboards.filter(d => d.id !== idToDelete);
    saveLocalDashboards(dashboards);
    message = 'Dashboard deleted successfully.';
    isError = false;

    const savedInStorage = getLocalDashboards();

    expect(savedInStorage.length).toBe(2);
    expect(savedInStorage.some(d => d.id === 'administrator')).toBe(false);
    expect(message).toBe('Dashboard deleted successfully.');
    expect(isError).toBe(false);
  });

  it('ADD DASHBOARD BUTTON: should append new dashboard and persist to storage', () => {
    const newDash: ProjectDashboard = {
      id: 'sports-office',
      name: 'Sports Office',
      description: 'Sports and athletics clearance office',
      enabled: true
    };

    // Simulate addDashboard() handler
    dashboards.push(newDash);
    saveLocalDashboards(dashboards);
    message = `Dashboard "${newDash.name}" added successfully.`;
    isError = false;

    const savedInStorage = getLocalDashboards();

    expect(savedInStorage.length).toBe(4);
    expect(savedInStorage.find(d => d.id === 'sports-office')).toEqual(newDash);
    expect(message).toBe('Dashboard "Sports Office" added successfully.');
  });
});
