// @vitest-environment jsdom
import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';

TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());

describe('AuthService profile photo', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeAll(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  beforeEach(() => localStorage.clear());

  afterEach(() => httpMock.verify());

  afterAll(() => TestBed.resetTestingModule());

  it('maps photo aliases and normalizes URL and base64 sources', () => {
    expect(service.mapUserResponse({ profile_image_url: '/uploads/student.jpg' }).photo).toBe('/uploads/student.jpg');
    expect(service.getProfilePhotoSource({ photo: '/uploads/student.jpg' })).toBe('/uploads/student.jpg');
    expect(service.getProfilePhotoSource({ profilePhoto: 'https://example.com/student.png' })).toBe('https://example.com/student.png');
    expect(service.getProfilePhotoSource({ photo: 'a'.repeat(101) })).toBe(`data:image/jpeg;base64,${'a'.repeat(101)}`);
    expect(service.getProfilePhotoSource({ photo: null })).toBeNull();
  });

  it('persists a refreshed profile photo for immediate use on other routes', () => {
    service.getProfile().subscribe(() => {
      expect(service.getProfilePhotoSource()).toBe('/uploads/student.jpg');
    });

    const profileRequest = httpMock.expectOne('http://localhost:8080/api/v1/auth/profile');
    profileRequest.flush({ id: 'student-1', profile_image_url: '/uploads/student.jpg', role: 'STUDENT' });
  });
});
