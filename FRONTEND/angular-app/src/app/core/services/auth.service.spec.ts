import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';

TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('falls back to the superuser login API for project-admin accounts created there', () => {
    const adminUser = {
      email: 'project.admin@example.com',
      name: 'Project Admin',
      role: 'PROJECT_ADMIN',
      projectId: 'project-123',
      permissions: ['MANAGE_CLEARANCE'],
      adminId: 'admin-123'
    };

    service.login('project.admin@example.com', 'StrongPass123!').subscribe((user) => {
      expect(user.role).toBe('Administrator');
      expect(user.projectId).toBe('project-123');
      expect(user.email).toBe('project.admin@example.com');
      expect(JSON.parse(localStorage.getItem('udsm-auth-token') ?? 'null')).toBe('super-user-token');
    });

    const backendLogin = httpMock.expectOne('http://localhost:8080/api/v1/auth/login');
    backendLogin.flush({ message: 'Invalid email/registration number or password' }, {
      status: 401,
      statusText: 'Unauthorized'
    });

    const superuserLogin = httpMock.expectOne('http://localhost:8090/api/login');
    superuserLogin.flush({
      token: 'super-user-token',
      user: adminUser
    });
  });
});
