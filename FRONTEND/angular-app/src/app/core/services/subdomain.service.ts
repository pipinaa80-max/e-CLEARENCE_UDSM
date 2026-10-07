import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';

export interface SubdomainTenant {
  id: string;
  subdomain: string;
  title: string;
  shortName: string;
  adminEmail: string;
  logoUrl?: string;
  primaryColor?: string;
  active: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class SubdomainService {
  private readonly storage = new StorageService();
  private readonly storageKey = 'udsm-subdomain-tenants';

  private readonly defaultTenants: SubdomainTenant[] = [
    {
      id: 'sub-udom',
      subdomain: 'udom',
      title: 'University of Dodoma',
      shortName: 'UDOM',
      adminEmail: 'admin@udom.ac.tz',
      primaryColor: '#00679b',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'sub-udsm',
      subdomain: 'udsm',
      title: 'University of Dar es Salaam',
      shortName: 'UDSM',
      adminEmail: 'admin@udsm.ac.tz',
      primaryColor: '#0864af',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'sub-duce',
      subdomain: 'duce',
      title: 'Dar es Salaam University College of Education',
      shortName: 'DUCE',
      adminEmail: 'principal.duce@udsm.ac.tz',
      primaryColor: '#00679b',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'sub-muce',
      subdomain: 'muce',
      title: 'Mkwawa University College of Education',
      shortName: 'MUCE',
      adminEmail: 'principal.muce@udsm.ac.tz',
      primaryColor: '#218739',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'sub-coict',
      subdomain: 'coict',
      title: 'College of Information and Communication Technologies',
      shortName: 'CoICT',
      adminEmail: 'principal.coict@udsm.ac.tz',
      primaryColor: '#003b5c',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'sub-mchas',
      subdomain: 'mchas',
      title: 'Mbeya College of Health and Allied Sciences',
      shortName: 'MCHAS',
      adminEmail: 'principal.mchas@udsm.ac.tz',
      primaryColor: '#1e3a8a',
      active: true,
      createdAt: new Date().toISOString()
    }
  ];

  generateSlug(text: string): string {
    if (!text) return '';

    // Check for explicit abbreviation in parentheses e.g. "College of Education (DUCE)" -> "duce"
    const match = text.match(/\(([^)]+)\)/);
    if (match && match[1] && match[1].length <= 8) {
      return match[1].toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    // Otherwise generate clean hyphenated slug
    return text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  getSubdomains(): SubdomainTenant[] {
    const saved = this.storage.get<SubdomainTenant[]>(this.storageKey);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return [...saved];
    }
    this.storage.save(this.storageKey, [...this.defaultTenants]);
    return [...this.defaultTenants];
  }

  createSubdomain(tenant: Omit<SubdomainTenant, 'id' | 'createdAt'>): SubdomainTenant | null {
    const slug = this.generateSlug(tenant.subdomain || tenant.title);
    if (!slug) return null;

    const current = this.getSubdomains();
    if (current.some(t => t.subdomain.toLowerCase() === slug.toLowerCase())) {
      return null; // Already exists
    }

    const newTenant: SubdomainTenant = {
      ...tenant,
      id: `sub-${crypto.randomUUID().substring(0, 8)}`,
      subdomain: slug,
      createdAt: new Date().toISOString()
    };

    current.push(newTenant);
    this.storage.save(this.storageKey, current);
    return newTenant;
  }

  deleteSubdomain(id: string): boolean {
    const current = this.getSubdomains();
    const filtered = current.filter(t => t.id !== id);
    if (filtered.length === current.length) return false;
    this.storage.save(this.storageKey, filtered);
    return true;
  }

  resetToDefaults(): SubdomainTenant[] {
    this.storage.save(this.storageKey, [...this.defaultTenants]);
    return [...this.defaultTenants];
  }
}
