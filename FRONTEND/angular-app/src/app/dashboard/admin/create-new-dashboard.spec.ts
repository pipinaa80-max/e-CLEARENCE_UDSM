import { describe, expect, it, beforeEach } from 'vitest';

interface ProjectDashboard {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface ProjectConfig {
  projectId: string;
  dashboards: ProjectDashboard[];
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

describe('Admin Dashboard - Create New Dashboard Verification', () => {
  let projectConfig: ProjectConfig;
  let newDashboard: { id: string; name: string; description: string };
  let message: string;
  let isError: boolean;

  const initialDashboards: ProjectDashboard[] = [
    { id: 'academic-staff', name: 'Academic Staff', description: 'Academic Staff clearance office', enabled: true },
    { id: 'finance', name: 'Finance', description: 'Finance clearance office', enabled: true },
    { id: 'library', name: 'Library', description: 'Library clearance office', enabled: true }
  ];

  const saveLocalDashboards = (dashboards: ProjectDashboard[]) => {
    localStorage.setItem('udsm-project-dashboards', JSON.stringify(dashboards));
  };

  const getLocalDashboards = (): ProjectDashboard[] => {
    const raw = localStorage.getItem('udsm-project-dashboards');
    return raw ? JSON.parse(raw) : [];
  };

  const addDashboardHandler = () => {
    const id = newDashboard.id.trim();
    const name = newDashboard.name.trim();
    const description = newDashboard.description.trim();

    if (!id || !name) {
      message = 'Dashboard ID and Name are required.';
      isError = true;
      return false;
    }

    if (projectConfig.dashboards.some(d => d.id === id)) {
      message = `Dashboard ID "${id}" already exists.`;
      isError = true;
      return false;
    }

    const newDashItem: ProjectDashboard = { id, name, description, enabled: true };
    projectConfig.dashboards.push(newDashItem);
    saveLocalDashboards(projectConfig.dashboards);
    message = `Dashboard "${name}" added successfully.`;
    isError = false;
    newDashboard = { id: '', name: '', description: '' };
    return true;
  };

  beforeEach(() => {
    (globalThis as any).localStorage = createLocalStorageMock();
    projectConfig = {
      projectId: 'udsm-main',
      dashboards: initialDashboards.map(d => ({ ...d }))
    };
    saveLocalDashboards(projectConfig.dashboards);
    newDashboard = { id: '', name: '', description: '' };
    message = '';
    isError = false;
  });

  it('should create a new dashboard and verify it appears in the list', () => {
    // Fill in new dashboard inputs
    newDashboard.id = 'alumni-relations';
    newDashboard.name = 'Alumni Relations Office';
    newDashboard.description = 'Manages graduate alumni records and clearance';

    const success = addDashboardHandler();
    expect(success).toBe(true);

    // Verify it was appended to projectConfig.dashboards
    expect(projectConfig.dashboards.length).toBe(4);
    const created = projectConfig.dashboards.find(d => d.id === 'alumni-relations');
    expect(created).toBeDefined();
    expect(created?.name).toBe('Alumni Relations Office');
    expect(created?.description).toBe('Manages graduate alumni records and clearance');
    expect(created?.enabled).toBe(true);

    // Verify form was reset
    expect(newDashboard.id).toBe('');
    expect(newDashboard.name).toBe('');

    // Verify persisted in localStorage
    const savedInStorage = getLocalDashboards();
    expect(savedInStorage.length).toBe(4);
    expect(savedInStorage.some(d => d.id === 'alumni-relations')).toBe(true);
  });

  it('should reject creation if Dashboard ID already exists', () => {
    newDashboard.id = 'finance'; // Already exists
    newDashboard.name = 'Duplicate Finance Office';
    newDashboard.description = 'Testing duplicate check';

    const success = addDashboardHandler();
    expect(success).toBe(false);
    expect(isError).toBe(true);
    expect(message).toBe('Dashboard ID "finance" already exists.');
    expect(projectConfig.dashboards.length).toBe(3);
  });

  it('should reject creation if ID or Name is empty', () => {
    newDashboard.id = '';
    newDashboard.name = '';

    const success = addDashboardHandler();
    expect(success).toBe(false);
    expect(isError).toBe(true);
    expect(message).toBe('Dashboard ID and Name are required.');
  });
});
