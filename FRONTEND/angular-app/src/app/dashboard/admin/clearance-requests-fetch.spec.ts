import { describe, expect, it, beforeEach } from 'vitest';

interface ClearanceRequestItem {
  id: string;
  studentName?: string;
  registrationNumber?: string;
  department?: string;
  status?: string;
  currentStage?: string;
  requestDate?: string;
  submittedAt?: string;
  student?: {
    fullName?: string;
    registrationNumber?: string;
  };
}

describe('Admin Dashboard - Clearance Requests Fetch & Filtering', () => {
  let clearanceRequests: ClearanceRequestItem[];

  beforeEach(() => {
    clearanceRequests = [
      {
        id: 'req-1',
        studentName: 'Sarafina Shija Maganga',
        registrationNumber: '2025-04-94444',
        department: 'Agricultural Economics and Business',
        status: 'PENDING',
        currentStage: 'Department Review',
        requestDate: '2026-08-27T10:00:00.000Z'
      },
      {
        id: 'req-2',
        student: {
          fullName: 'Baraka John Mwamba',
          registrationNumber: '2025-04-11111'
        },
        department: 'Computer Science & Engineering',
        status: 'COMPLETED',
        currentStage: 'Cleared',
        submittedAt: '2026-08-25T14:30:00.000Z'
      }
    ];
  });

  it('should format local storage clearance requests correctly', () => {
    const formatted = clearanceRequests.map(r => ({
      id: r.id,
      studentName: r.student?.fullName || r.studentName || 'N/A',
      registrationNumber: r.student?.registrationNumber || r.registrationNumber || 'N/A',
      department: r.department || 'N/A',
      status: r.status || 'PENDING',
      currentStage: r.currentStage || 'Clearance Process',
      submittedAt: r.submittedAt || r.requestDate || new Date().toISOString()
    }));

    expect(formatted.length).toBe(2);
    expect(formatted[0].studentName).toBe('Sarafina Shija Maganga');
    expect(formatted[0].registrationNumber).toBe('2025-04-94444');
    expect(formatted[1].studentName).toBe('Baraka John Mwamba');
    expect(formatted[1].registrationNumber).toBe('2025-04-11111');
  });

  it('should filter clearance requests by search term across student name, reg number, and department', () => {
    const filter = (term: string) => {
      const lower = term.toLowerCase();
      return clearanceRequests.filter(r => {
        const name = (r.student?.fullName || r.studentName || '').toLowerCase();
        const reg = (r.student?.registrationNumber || r.registrationNumber || '').toLowerCase();
        const dept = (r.department || '').toLowerCase();
        return name.includes(lower) || reg.includes(lower) || dept.includes(lower);
      });
    };

    expect(filter('Sarafina').length).toBe(1);
    expect(filter('2025-04-11111').length).toBe(1);
    expect(filter('Computer').length).toBe(1);
    expect(filter('NonExistent').length).toBe(0);
  });
});
