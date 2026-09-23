import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class AwardService {
  private readonly storage = new StorageService();
  private readonly awardsKey = 'udsm-system-awards';

  private readonly defaultAwards = [
    'Certificate',
    'Diploma',
    'Bachelor Degree',
    'Postgraduate Diploma',
    'Master Degree',
    'PhD'
  ];

  getAwards(): string[] {
    const saved = this.storage.get<string[]>(this.awardsKey);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return [...saved];
    }
    this.storage.save(this.awardsKey, [...this.defaultAwards]);
    return [...this.defaultAwards];
  }

  addAward(awardName: string): boolean {
    const trimmed = awardName.trim();
    if (!trimmed) return false;
    const current = this.getAwards();
    if (current.some(a => a.toLowerCase() === trimmed.toLowerCase())) {
      return false;
    }
    current.push(trimmed);
    this.storage.save(this.awardsKey, current);
    return true;
  }

  deleteAward(awardName: string): boolean {
    const current = this.getAwards();
    const updated = current.filter(a => a.toLowerCase() !== awardName.trim().toLowerCase());
    if (updated.length === current.length) return false;
    this.storage.save(this.awardsKey, updated);
    return true;
  }

  resetToDefaults(): string[] {
    const copy = [...this.defaultAwards];
    this.storage.save(this.awardsKey, copy);
    return copy;
  }
}
