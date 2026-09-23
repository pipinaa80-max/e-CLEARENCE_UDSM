import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProjectAdminService } from '../../core/services/project-admin.service';

@Component({
  selector: 'app-signup-options',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './signup-options.html',
  styleUrl: './signup-options.css',
})
export class SignupOptions implements OnInit {
  private readonly projectAdminService = inject(ProjectAdminService);

  branding = {
    universityName: 'University of Dar es Salaam',
    shortName: 'UDSM',
    logoUrl: '/public/udsm-logo.png'
  };

  ngOnInit(): void {
    const saved = this.projectAdminService.getSavedBranding();
    if (saved) {
      this.branding = {
        universityName: saved.universityName || this.branding.universityName,
        shortName: saved.shortName || this.branding.shortName,
        logoUrl: saved.logoUrl || this.branding.logoUrl
      };
    }
  }
}
