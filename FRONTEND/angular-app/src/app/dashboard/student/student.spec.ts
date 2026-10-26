import '@angular/compiler';

import { describe, expect, it } from 'vitest';
import { StudentDashboard } from './student';

function dashboardFor(systemType: 'clearance' | 'transcript'): StudentDashboard {
  const dashboard = Object.create(StudentDashboard.prototype) as StudentDashboard;
  dashboard.systemType = systemType;
  return dashboard;
}

describe('Student dashboard system-specific tracking', () => {
  it('selects clearance tracking in clearance mode', () => {
    const dashboard = dashboardFor('clearance');

    expect(dashboard.isTranscriptSystem).toBe(false);
  });

  it('selects transcript tracking in transcript mode', () => {
    const dashboard = dashboardFor('transcript');

    expect(dashboard.isTranscriptSystem).toBe(true);
  });
});
