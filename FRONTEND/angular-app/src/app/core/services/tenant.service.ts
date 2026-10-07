import { Injectable, inject } from '@angular/core';
import { SubdomainService, SubdomainTenant } from './subdomain.service';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly subdomainService = inject(SubdomainService);

  getActiveSubdomainFromUrl(): string | null {
    if (typeof window === 'undefined') return null;

    // Method 1: Check query parameter e.g., ?tenant=duce
    const urlParams = new URLSearchParams(window.location.search);
    const tenantParam = urlParams.get('tenant');
    if (tenantParam) {
      return tenantParam.trim().toLowerCase();
    }

    // Method 2: Extract subdomain from hostname e.g., duce.localhost or duce.clearance.ac.tz
    const hostname = window.location.hostname.toLowerCase();
    const parts = hostname.split('.');

    if (parts.length >= 2) {
      const firstPart = parts[0];
      if (firstPart !== 'www' && firstPart !== 'localhost' && firstPart !== '127') {
        return firstPart;
      }
    }

    return null;
  }

  getTenantBySubdomain(slug: string): SubdomainTenant | null {
    if (!slug) return null;
    const subdomains = this.subdomainService.getSubdomains();
    return subdomains.find(t => t.subdomain.toLowerCase() === slug.toLowerCase()) ?? null;
  }

  isCurrentTenantActive(): boolean {
    const slug = this.getActiveSubdomainFromUrl();
    if (!slug) return true;

    const tenant = this.getTenantBySubdomain(slug);
    if (!tenant) return true;

    return tenant.active;
  }

  getCurrentTenant(): SubdomainTenant | null {
    const slug = this.getActiveSubdomainFromUrl();
    if (!slug) return null;

    const subdomains = this.subdomainService.getSubdomains();
    return subdomains.find(t => t.subdomain.toLowerCase() === slug.toLowerCase() && t.active) ?? null;
  }
}
