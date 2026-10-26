import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ToastComponent } from './shared/components/toast/toast';
import { normalizeBrandAssetUrl, ProjectAdminService, ProjectConfig } from './core/services/project-admin.service';
import { AuthService } from './core/services/auth.service';
import { DEFAULT_UDSM_BRAND_COLOR, normalizeUdsmBrandColor } from './core/config/udsm-brand-colors';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly projectAdminService = inject(ProjectAdminService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly currentYear = new Date().getFullYear();
  branding: ProjectConfig['branding'] = { universityName: 'University of Dar es Salaam', shortName: 'Clearance', logoUrl: '/udsm-logo.png', backgroundUrl: '/background.png', primaryColor: '#0864af', fontFamily: 'Segoe UI', footerLinks: [] };
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

    if (this.authService.getToken()) {
      this.projectAdminService.getMyBranding().subscribe({
        next: (branding) => {
          this.projectAdminService.setSavedBranding(branding);
          this.applyBranding(branding);
        },
        error: () => {
          if (saved) this.applyBranding(saved);
        }
      });
      return;
    }

    // Keep the last saved institutional assets when logged out. Fetching public branding
    // again here can replace the logo/background URL the admin just saved.
    if (saved && (
      Boolean(saved.logoUrl || saved.backgroundUrl) ||
      (saved.primaryColor && normalizeUdsmBrandColor(saved.primaryColor) !== DEFAULT_UDSM_BRAND_COLOR)
    )) {
      this.applyBranding(saved);
      return;
    }

    // Only fallback to public/global branding if no custom theme is found locally
    this.projectAdminService.getPublicBranding().subscribe({
      next: (config) => {
        this.projectAdminService.setSavedBranding(config);
        this.applyBranding(config);
      },
      error: () => {
        if (saved) this.applyBranding(saved);
      }
    });
  }

  private applyBranding(config: Partial<typeof this.branding>): void {
    const normalizedLogo = normalizeBrandAssetUrl(config.logoUrl ?? this.branding.logoUrl, '/udsm-logo.png');
    const normalizedConfig = {
      ...config,
      logoUrl: normalizedLogo === 'none' ? '/udsm-logo.png' : normalizedLogo,
      backgroundUrl: normalizeBrandAssetUrl(config.backgroundUrl ?? this.branding.backgroundUrl),
      primaryColor: normalizeUdsmBrandColor(config.primaryColor ?? this.branding.primaryColor)
    };
    this.branding = { ...this.branding, ...normalizedConfig };
    const root = document.documentElement;
    root.style.setProperty('--udsm-blue', this.branding.primaryColor);
    root.style.setProperty('--udsm-blue-dark', `color-mix(in srgb, ${this.branding.primaryColor} 85%, #000)`);
    root.style.setProperty('--udsm-blue-light', `color-mix(in srgb, ${this.branding.primaryColor} 12%, #fff)`);
    // Explicitly set sidebar background to match primary or dark version for better UI
    root.style.setProperty('--sidebar-bg', this.branding.primaryColor);
    if (this.branding.fontFamily) root.style.setProperty('--app-font-family', this.branding.fontFamily);

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
      root.style.setProperty('--app-bg-url', `url(${JSON.stringify(this.branding.backgroundUrl)})`);

      // Set the overlay to be transparent (0% tint) for custom backgrounds
      root.style.setProperty('--hero-gradient', 'none');
    }

    this.refreshBrandingNodes();
  }

  private refreshBrandingNodes(): void {
    if (this.branding.logoUrl) {
      const logoUrl = normalizeBrandAssetUrl(this.branding.logoUrl, '/udsm-logo.png');
      document.querySelectorAll<HTMLImageElement>('img[src*="udsm-logo"], img[src*="logo"], img[alt*="Logo"], img[alt*="logo"], img[alt*="Crest"], img[alt*="UDSM"], .brand img, .brand-logo, .header-logo, .nav-logo, .hero-logo')
        .forEach(image => {
          const currentUrl = normalizeBrandAssetUrl(image.getAttribute('src'), '');
          if (currentUrl !== logoUrl) image.setAttribute('src', logoUrl);
        });
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

    const targetName = 'University of Dar es Salaam';
    const currentName = this.branding.universityName || 'University of Dar es Salaam';

    const targetShortName = 'UDSM';
    const currentShortName = this.branding.shortName || 'UDSM';

    textNodes.forEach(node => {
      const parent = node.parentElement;
      if (!parent || parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') return;

      let originalText = parent.getAttribute('data-original-text');
      if (!originalText) {
        if (node.nodeValue?.includes(targetName) || node.nodeValue?.includes(targetShortName)) {
          originalText = node.nodeValue;
          parent.setAttribute('data-original-text', originalText);
        }
      }

      if (originalText) {
        let newText = originalText.replaceAll(targetName, currentName);
        if (currentShortName && currentShortName !== targetShortName) {
          newText = newText.replaceAll(targetShortName, currentShortName);
        }
        if (node.nodeValue !== newText) {
          node.nodeValue = newText;
        }
      }
    });
  }
}
