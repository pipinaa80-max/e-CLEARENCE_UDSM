import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { UserRole } from '../core/models/user.model';
import { ProjectAdminService, ProjectConfig } from '../core/services/project-admin.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  templateUrl: './landing.html',
  styleUrl: './landing.css'
})
export class Landing implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly projectAdminService = inject(ProjectAdminService);

  branding: ProjectConfig['branding'] = {
    universityName: 'University of Dar es Salaam',
    shortName: 'Clearance',
    logoUrl: '/public/udsm-logo.png',
    backgroundUrl: '/background_image.png',
    primaryColor: '#0864af',
    fontFamily: 'Segoe UI',
    footerLinks: []
  };

  ngOnInit(): void {
    const saved = this.projectAdminService.getSavedBranding();
    if (saved) {
      this.branding = { ...this.branding, ...saved };
    }

    // Subscribe to branding changes via event to stay in sync with App component
    window.addEventListener('project-branding-updated', (event: Event) => {
      const customEvent = event as CustomEvent<{ branding?: Partial<ProjectConfig['branding']> }>;
      if (customEvent.detail?.branding) {
        this.branding = { ...this.branding, ...customEvent.detail.branding };
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  private redirectPathFor(role: UserRole): string {
    const map: Record<UserRole, string> = {
      Student: '/dashboard',
      Convocation: '/convocation/dashboard',
      'Games Coach': '/dashboard/games-coach',
      'Hall Warden': '/dashboard/hall-warden',
      USAB: '/dashboard/usab',
      DARUSO: '/dashboard/daruso',
      Library: '/dashboard/library',
      'Dean of Students': '/dashboard/dean-of-students',
      'Smart Card': '/dashboard/smart-card',
      Department: '/department/dashboard',
      Principal: '/dashboard/principal',
      Finance: '/dashboard/finance',
      Workshop: '/dashboard/workshop',
      Laboratory: '/dashboard/laboratory',
      ICT: '/dashboard/ict',
      'Academic Staff': '/dashboard/academic',
      Administrator: '/dashboard/admin'
    };

    return map[role] ?? '/dashboard';
  }
}
