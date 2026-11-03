import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { AuthService } from './auth.service';

export interface CollectionStation {
  id: string;
  code: string;
  name: string;
  region: string;
  district?: string;
  address: string;
  operatingHours: string;
  contactPhone?: string;
  contactEmail?: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CollectionStationService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly authService = inject(AuthService);

  private readonly defaultStations: CollectionStation[] = [
    {
      id: 'stn-udsm-main',
      code: 'UDSM-MAIN',
      name: 'UDSM Main Campus - DUS Central Station',
      region: 'Dar es Salaam',
      district: 'Ubunifu / Kinondoni',
      address: 'DUS Building Room 102, Main Campus',
      operatingHours: 'Mon - Fri: 08:00 - 16:00',
      contactPhone: '+255 22 2410500',
      contactEmail: 'dus.collection@udsm.ac.tz',
      isActive: true
    },
    {
      id: 'stn-coict-kijito',
      code: 'COICT-HUB',
      name: 'CoICT Kijitonyama Dispatch Center',
      region: 'Dar es Salaam',
      district: 'Kijitonyama',
      address: 'CoICT Block A Ground Floor, Kijitonyama Campus',
      operatingHours: 'Mon - Fri: 08:00 - 16:00',
      contactPhone: '+255 22 2700010',
      contactEmail: 'coict.collection@udsm.ac.tz',
      isActive: true
    },
    {
      id: 'stn-arusha-hub',
      code: 'ARUSHA-HUB',
      name: 'UDSM Arusha Regional Collection Station',
      region: 'Arusha',
      district: 'Arusha Urban',
      address: 'UDSM Extension Center, Clocktower Street',
      operatingHours: 'Mon - Fri: 08:30 - 16:30',
      contactPhone: '+255 27 2548890',
      contactEmail: 'arusha.center@udsm.ac.tz',
      isActive: true
    },
    {
      id: 'stn-mwanza-hub',
      code: 'MWANZA-HUB',
      name: 'UDSM Mwanza Regional Collection Station',
      region: 'Mwanza',
      district: 'Nyamagana',
      address: 'UDSM Lake Zone Center, Station Road',
      operatingHours: 'Mon - Fri: 08:30 - 16:30',
      contactPhone: '+255 28 2500411',
      contactEmail: 'mwanza.center@udsm.ac.tz',
      isActive: true
    },
    {
      id: 'stn-mbeya-hub',
      code: 'MBEYA-HUB',
      name: 'UDSM Mbeya Regional Collection Station',
      region: 'Mbeya',
      district: 'Mbeya City',
      address: 'UDSM Southern Highlands Bureau, Posta Street',
      operatingHours: 'Mon - Fri: 08:30 - 16:30',
      contactPhone: '+255 25 2502200',
      contactEmail: 'mbeya.center@udsm.ac.tz',
      isActive: true
    },
    {
      id: 'stn-dodoma-hub',
      code: 'DODOMA-HUB',
      name: 'UDSM Capital Dodoma Collection Bureau',
      region: 'Dodoma',
      district: 'Dodoma Urban',
      address: 'Government City Sub-Bureau, Block B',
      operatingHours: 'Mon - Fri: 08:00 - 16:00',
      contactPhone: '+255 26 2321100',
      contactEmail: 'dodoma.center@udsm.ac.tz',
      isActive: true
    }
  ];

  private getAuthHeaders(): HttpHeaders | undefined {
    const token = this.authService.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
  }

  // Get active stations for student dropdowns
  getActiveStations(): Observable<CollectionStation[]> {
    const url = `${this.config.apiUrl}/collection-stations`;
    return this.http.get<CollectionStation[]>(url).pipe(
      catchError(() => of(this.defaultStations.filter(s => s.isActive)))
    );
  }

  // Get all stations for Director of Undergraduate Studies
  getAllStations(): Observable<CollectionStation[]> {
    const url = `${this.config.apiUrl}/collection-stations/all`;
    const headers = this.getAuthHeaders();
    return this.http.get<CollectionStation[]>(url, { headers }).pipe(
      catchError(() => of(this.defaultStations))
    );
  }

  // Create new station (Director)
  createStation(station: Omit<CollectionStation, 'id'>): Observable<CollectionStation> {
    const url = `${this.config.apiUrl}/collection-stations`;
    const headers = this.getAuthHeaders();
    return this.http.post<CollectionStation>(url, station, { headers });
  }

  // Update station
  updateStation(id: string, station: Partial<CollectionStation>): Observable<CollectionStation> {
    const url = `${this.config.apiUrl}/collection-stations/${id}`;
    const headers = this.getAuthHeaders();
    return this.http.put<CollectionStation>(url, station, { headers });
  }

  // Soft delete station
  deleteStation(id: string): Observable<void> {
    const url = `${this.config.apiUrl}/collection-stations/${id}`;
    const headers = this.getAuthHeaders();
    return this.http.delete<void>(url, { headers });
  }
}
