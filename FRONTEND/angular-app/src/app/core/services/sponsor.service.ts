import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { StorageService } from './storage.service';
import { Sponsor } from '../models/sponsor.model';

@Injectable({
  providedIn: 'root'
})
export class SponsorService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly storage = new StorageService();

  private readonly defaultSponsors: Sponsor[] = [
    { name: 'HESLB', code: 'HESLB', description: 'Higher Education Students\' Loans Board', isActive: true },
    { name: 'Karimjee Scholarships', code: 'KARIMJEE', description: 'Karimjee Jivanjee Foundation Scholarship', isActive: true },
    { name: 'MO scholarship', code: 'MO', description: 'Mo Dewji Foundation Scholarship', isActive: true },
    { name: 'PRIVATE', code: 'PRIVATE', description: 'Self-sponsored / Private funding', isActive: true }
  ];

  private readonly sponsorsSubject = new BehaviorSubject<Sponsor[]>(this.defaultSponsors);
  public readonly sponsors$ = this.sponsorsSubject.asObservable();

  private getAuthHeaders(): HttpHeaders {
    const token = this.storage.get<string>('udsm-auth-token')?.replace(/^"|"$/g, '') || null;
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  // Fetch active sponsors (public/student dropdown)
  getActiveSponsors(): Observable<Sponsor[]> {
    return this.http.get<Sponsor[]>(`${this.config.apiUrl}/sponsors`).pipe(
      map(items => {
        if (!items || !items.length) return this.defaultSponsors;
        return items;
      }),
      tap(items => this.sponsorsSubject.next(items)),
      catchError(err => {
        console.warn('Could not load sponsors from backend, using defaults:', err);
        return of(this.sponsorsSubject.value);
      })
    );
  }

  // Fetch all sponsors (for admin panel)
  getAllSponsors(): Observable<Sponsor[]> {
    return this.http.get<Sponsor[]>(`${this.config.apiUrl}/sponsors/all`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(items => {
        if (!items || !items.length) return this.sponsorsSubject.value;
        return items;
      }),
      catchError(err => {
        console.warn('Could not load all sponsors, falling back to active list:', err);
        return of(this.sponsorsSubject.value);
      })
    );
  }

  // Create new sponsor
  createSponsor(sponsor: Partial<Sponsor>): Observable<Sponsor> {
    return this.http.post<Sponsor>(`${this.config.apiUrl}/sponsors`, sponsor, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(newSponsor => {
        const current = this.sponsorsSubject.value;
        if (!current.some(s => s.name.toLowerCase() === newSponsor.name.toLowerCase())) {
          this.sponsorsSubject.next([...current, newSponsor]);
        }
      })
    );
  }

  // Update sponsor
  updateSponsor(id: string, sponsor: Partial<Sponsor>): Observable<Sponsor> {
    return this.http.put<Sponsor>(`${this.config.apiUrl}/sponsors/${encodeURIComponent(id)}`, sponsor, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(updated => {
        const list = this.sponsorsSubject.value.map(s => s.id === id ? { ...s, ...updated } : s);
        this.sponsorsSubject.next(list);
      })
    );
  }

  // Delete sponsor
  deleteSponsor(id: string): Observable<void> {
    return this.http.delete<void>(`${this.config.apiUrl}/sponsors/${encodeURIComponent(id)}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(() => {
        const list = this.sponsorsSubject.value.filter(s => s.id !== id);
        this.sponsorsSubject.next(list);
      })
    );
  }
}

