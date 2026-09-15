import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
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
  private readonly router = inject(Router);
  readonly currentYear = new Date().getFullYear();
  branding: ProjectConfig['branding'] = { universityName: 'University of Dar es Salaam', shortName: 'Clearance', logoUrl: '/public/udsm-logo.png', backgroundUrl: '/public/background.png', primaryColor: '#0864af', fontFamily: 'Segoe UI' };
  private brandingObserver?: MutationObserver;

  constructor() {
    const saved = this.projectAdminService.getSavedBranding();
    if (saved) this.applyBranding(saved);

    this.refreshBranding();
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(() => this.refreshBranding());
    window.addEventListener('project-branding-updated', (event: Event) => {
      const customEvent = event as CustomEvent<{ branding?: Partial<ProjectConfig['branding']> }>; 
      if (customEvent.detail?.branding) this.applyBranding(customEvent.detail.branding);
    });

    this.brandingObserver = new MutationObserver(() => this.refreshBrandingNodes());
    this.brandingObserver.observe(document.body, { childList: true, subtree: true });
  }

  private refreshBranding(): void {
    const saved = this.projectAdminService.getSavedBranding();
    if (saved) {
      this.applyBranding(saved);
      return;
    }

    if (this.authService.getToken()) {
      this.projectAdminService.getMyBranding().subscribe({
        next: (branding) => {
          this.projectAdminService.setSavedBranding(branding);
          this.applyBranding(branding);
        },
        error: () => this.projectAdminService.getPublicBranding().subscribe({ next: (config) => this.applyBranding(config), error: () => undefined })
      });
      return;
    }

    this.projectAdminService.getPublicBranding().subscribe({ next: (config) => this.applyBranding(config), error: () => undefined });
  }

  private applyBranding(config: Partial<typeof this.branding>): void {
    // Sanitize URLs to handle Windows-style slashes
    if (config.logoUrl) config.logoUrl = config.logoUrl.trim().replace(/\\/g, '/');
    if (config.backgroundUrl) config.backgroundUrl = config.backgroundUrl.trim().replace(/\\/g, '/');

    this.branding = { ...this.branding, ...config };
    const root = document.documentElement;
    if (config.primaryColor) {
      root.style.setProperty('--udsm-blue', config.primaryColor);
      root.style.setProperty('--udsm-blue-dark', `color-mix(in srgb, ${config.primaryColor} 85%, #000)`);
      root.style.setProperty('--udsm-blue-light', `color-mix(in srgb, ${config.primaryColor} 12%, #fff)`);
      // Explicitly set sidebar background to match primary or dark version for better UI
      root.style.setProperty('--sidebar-bg', config.primaryColor);
    }
    if (config.fontFamily) root.style.setProperty('--app-font-family', config.fontFamily);

    if (this.branding.logoUrl) {
      root.style.setProperty('--app-logo-url', `url("${this.branding.logoUrl}")`);
    }

    // Robustly handle the background image URL
    if (this.branding.backgroundUrl === '' || !this.branding.backgroundUrl) {
      // Use default background if empty
      root.style.setProperty('--app-bg-url', 'url("/background_image.png")');
      root.style.setProperty('--hero-gradient', 'linear-gradient(rgba(5, 63, 112, 0.65), rgba(5, 63, 112, 0.7))');
    } else if (this.branding.backgroundUrl.toLowerCase() === 'none') {
      root.style.setProperty('--app-bg-url', 'none');
      root.style.setProperty('--hero-gradient', 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7))');
    } else {
      let bgUrl = this.branding.backgroundUrl;

      // Format path for public assets
      if (!bgUrl.startsWith('http') && !bgUrl.startsWith('/') && !bgUrl.startsWith('data:')) {
        bgUrl = '/' + bgUrl;
      }
      // Resolve workspace paths to the URL exposed by the Angular dev server.
      const publicAssetIndex = bgUrl.toLowerCase().lastIndexOf('/public/');
      if (publicAssetIndex >= 0) bgUrl = bgUrl.substring(publicAssetIndex);
      if (bgUrl.toLowerCase().startsWith('public/')) bgUrl = '/' + bgUrl;
      if (!bgUrl.startsWith('/') && !bgUrl.startsWith('http') && !bgUrl.startsWith('data:')) {
        bgUrl = '/' + bgUrl;
      }

      console.log('🖼️ Dynamic Background Updated to:', bgUrl);
      root.style.setProperty('--app-bg-url', `url("${bgUrl}")`);

      // Set the overlay to be transparent (0% tint) for custom backgrounds
      root.style.setProperty('--hero-gradient', 'none');
    }

    this.refreshBrandingNodes();
  }

  private refreshBrandingNodes(): void {
    if (this.branding.logoUrl) {
      document.querySelectorAll<HTMLImageElement>('img[src*="udsm-logo"], img[alt*="Logo"], img[alt*="logo"], img[alt*="Crest"], .brand img, .brand-logo, .header-logo, .nav-logo, .hero-logo')
        .forEach(image => {
          if (image.src !== this.branding.logoUrl) image.src = this.branding.logoUrl;
        });
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

    const targetName = 'University of Dar es Salaam';
    textNodes.forEach(node => {
      if (node.nodeValue?.includes(targetName)) {
        node.nodeValue = node.nodeValue.replaceAll(targetName, this.branding.universityName);
      }
    });
  }
}
