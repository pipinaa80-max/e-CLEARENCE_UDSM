import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast';
import { ProjectAdminService, ProjectConfig } from './core/services/project-admin.service';
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
  branding: ProjectConfig['branding'] = { universityName: 'University of Dar es Salaam', shortName: 'Clearance', logoUrl: '/public/udsm-logo.png', primaryColor: '#0864af', fontFamily: 'Segoe UI' };
  private brandingObserver?: MutationObserver;

  constructor() {
    this.projectAdminService.getPublicBranding().subscribe({ next: (config) => this.applyBranding(config), error: () => undefined });
    if (this.authService.getToken()) this.projectAdminService.getProjectConfig().subscribe({ next: (config) => this.applyBranding(config.branding), error: () => undefined });
    this.brandingObserver = new MutationObserver(() => this.refreshBrandingNodes());
    this.brandingObserver.observe(document.body, { childList: true, subtree: true });
  }

  private applyBranding(config: Partial<typeof this.branding>): void {
    this.branding = { ...this.branding, ...config };
    const root = document.documentElement;
    if (config.primaryColor) root.style.setProperty('--udsm-blue', config.primaryColor);
    if (config.fontFamily) root.style.setProperty('--app-font-family', config.fontFamily);
    if (config.logoUrl) root.style.setProperty('--app-logo-url', `url("${config.logoUrl}")`);
    this.refreshBrandingNodes();
  }

  private refreshBrandingNodes(): void {
    if (this.branding.logoUrl) {
      document.querySelectorAll<HTMLImageElement>('img[src*="udsm-logo"], img[alt*="Logo"], img[alt*="logo"], img[alt*="Crest"], .brand img, .brand-logo, .header-logo, .nav-logo, .hero-logo')
        .forEach(image => image.src = this.branding.logoUrl);
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
    textNodes.forEach(node => { if (node.nodeValue?.trim() === 'University of Dar es Salaam') node.nodeValue = node.nodeValue.replace('University of Dar es Salaam', this.branding.universityName); });
  }
}
