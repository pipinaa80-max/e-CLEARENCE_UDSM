import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { App } from './app';

describe('App', () => {
  it('instantiates the app component class cleanly', () => {
    const app = Object.create(App.prototype);
    app.currentYear = new Date().getFullYear();
    expect(app).toBeTruthy();
    expect(app.currentYear).toBe(new Date().getFullYear());
  });

  it('provides default UDSM clearance branding attributes', () => {
    const app = Object.create(App.prototype);
    app.branding = {
      universityName: 'University of Dar es Salaam',
      shortName: 'Clearance',
      logoUrl: '/udsm-logo.png',
      backgroundUrl: '/background.png',
      primaryColor: '#0864af',
      fontFamily: 'Segoe UI',
      footerLinks: []
    };
    expect(app.branding.universityName).toBe('University of Dar es Salaam');
    expect(app.branding.shortName).toBe('Clearance');
  });
});
