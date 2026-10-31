import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface HostelWing {
  id: string;
  name: string;
}

export interface HostelBlock {
  id: string;
  name: string;
}

export interface HostelDetail {
  id: string;
  name: string;
  hasWings?: boolean;
  wings?: string[];
  hasBlocks?: boolean;
  blocks?: string[];
  capacity?: number;
  location?: string;
  description?: string;
  wardenName?: string;
  wardenContact?: string;
}

const STORAGE_KEY = 'udsm-hostel-details';

const DEFAULT_HOSTELS: HostelDetail[] = [
  {
    id: 'coict-hostels',
    name: 'CoICT Hostels',
    hasWings: true,
    wings: ['Wing A', 'Wing B'],
    hasBlocks: false,
    blocks: [],
    capacity: 400,
    location: 'Kijitonyama Campus',
    description: 'Hostels designated for College of Information and Communication Technologies students.',
    wardenName: 'CoICT Hall Warden',
    wardenContact: '+255 22 277 4443'
  },
  {
    id: 'kunduchi-hostels',
    name: 'Kunduchi Hostels',
    hasWings: false,
    wings: [],
    hasBlocks: false,
    blocks: [],
    capacity: 350,
    location: 'Kunduchi Fisheries Campus',
    description: 'Hostels accommodating Aquatic Sciences and Fisheries students.',
    wardenName: 'Kunduchi Hall Warden',
    wardenContact: '+255 22 265 0011'
  },
  {
    id: 'mabibo-hostels',
    name: 'Mabibo Hostels',
    hasWings: false,
    wings: [],
    hasBlocks: true,
    blocks: ['Block A', 'Block B', 'Block C', 'Block D', 'Block E', 'Block F'],
    capacity: 4500,
    location: 'Mabibo External Campus',
    description: 'Main residential complex with multiple multi-storey accommodation blocks.',
    wardenName: 'Mabibo Warden Office',
    wardenContact: '+255 22 244 3500'
  },
  {
    id: 'magufuli-hostels',
    name: 'Magufuli Hostels',
    hasWings: false,
    wings: [],
    hasBlocks: true,
    blocks: ['Block A', 'Block B', 'Block C', 'Block D', 'Block E', 'Block F'],
    capacity: 3840,
    location: 'Mlimani Main Campus',
    description: 'Modern residential hostel complex on the main campus comprising 6 blocks.',
    wardenName: 'Magufuli Hostels Warden',
    wardenContact: '+255 22 241 0500'
  },
  {
    id: 'mikocheni-hostels',
    name: 'Mikocheni Hostels',
    hasWings: false,
    wings: [],
    hasBlocks: false,
    blocks: [],
    capacity: 250,
    location: 'Mikocheni Area',
    description: 'Hostels for medical and allied sciences students.',
    wardenName: 'Mikocheni Hall Warden',
    wardenContact: '+255 22 277 5555'
  }
];

@Injectable({
  providedIn: 'root'
})
export class HostelService {
  private readonly hostels$ = new BehaviorSubject<HostelDetail[]>(this.loadHostels());

  getHostels(): Observable<HostelDetail[]> {
    return this.hostels$.asObservable();
  }

  getHostelsSnapshot(): HostelDetail[] {
    return this.hostels$.getValue();
  }

  getHostelNames(): string[] {
    return this.getHostelsSnapshot().map(h => h.name);
  }

  getHostelByName(name: string): HostelDetail | undefined {
    return this.getHostelsSnapshot().find(h => h.name.toLowerCase() === name.toLowerCase());
  }

  getWingsForHostel(hostelName: string): string[] {
    const hostel = this.getHostelByName(hostelName);
    return hostel?.wings || [];
  }

  getBlocksForHostel(hostelName: string): string[] {
    const hostel = this.getHostelByName(hostelName);
    return hostel?.blocks || [];
  }

  saveHostel(hostel: HostelDetail): void {
    const list = [...this.getHostelsSnapshot()];
    const index = list.findIndex(h => h.id === hostel.id || h.name.toLowerCase() === hostel.name.toLowerCase());

    if (index >= 0) {
      list[index] = { ...hostel };
    } else {
      list.push({ ...hostel });
    }

    this.persist(list);
  }

  deleteHostel(id: string): void {
    const list = this.getHostelsSnapshot().filter(h => h.id !== id);
    this.persist(list);
  }

  resetToDefaults(): void {
    this.persist(DEFAULT_HOSTELS);
  }

  private loadHostels(): HostelDetail[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load hostel details from storage:', e);
    }
    return DEFAULT_HOSTELS;
  }

  private persist(list: HostelDetail[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save hostel details:', e);
    }
    this.hostels$.next(list);
  }
}
