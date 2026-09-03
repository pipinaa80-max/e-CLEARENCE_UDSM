import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast';
import { ProjectAdminService } from './core/services/project-admin.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly projectAdminService = inject(ProjectAdminService);
  private readonly authService = inject(AuthService);
  readonly currentYear = new Date().getFullYear();
  branding = { universityName: 'University of Dar es Salaam', shortName: 'Clearance', logoUrl: '/public/udsm-logo.png' };

  constructor() {
    if (this.authService.getToken()) {
      this.projectAdminService.getProjectConfig().subscribe({ next: (config) => this.branding = { ...this.branding, ...config.branding }, error: () => undefined });
    }
  }
}
