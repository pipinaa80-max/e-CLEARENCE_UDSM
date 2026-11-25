import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { TranscriptPaymentService } from '../core/services/transcript-payment.service';
import { CollectionStationService, CollectionStation } from '../core/services/collection-station.service';
import { DashboardHeaderComponent } from '../shared/components/dashboard-header/dashboard-header';
import { DocumentService } from '../core/services/document.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-transcript-collection',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RouterLinkActive, DashboardHeaderComponent],
  templateUrl: './collection.html',
  styleUrl: './collection.css'
})
export class TranscriptCollectionComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly paymentService = inject(TranscriptPaymentService);
  private readonly documentService = inject(DocumentService);
  private readonly stationService = inject(CollectionStationService);
  private readonly router = inject(Router);

  sidebarOpen = false;
  message = '';
  stations: CollectionStation[] = [];
  selectedStation: CollectionStation | null = null;
  loading = true;

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  get isTranscriptPaid(): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    const requests = this.paymentService.getStudentRequests(user.id);
    return requests.some(r => r.serverManaged && r.attemptNumber === 1 && r.status === 'Paid');
  }

  form = this.fb.nonNullable.group({
    collectionMethod: ['' as 'Physical Collection' | 'Post by DHL' | '', Validators.required],
    stationId: [''],
    postingRegion: [''],
    postingWard: [''],
    postingPoBox: [''],
    postingContactPhone: [''],
    postingContactEmail: [''],
    postingAddress: ['']
  });

  get request() {
    const user = this.authService.getCurrentUser();
    return user ? this.paymentService.getStudentRequests(user.id)
      .filter(request => request.serverManaged && request.status === 'Paid')
      .at(-1) ?? null : null;
  }

  get isPost(): boolean {
    return this.form.controls.collectionMethod.value === 'Post by DHL';
  }

  get isPhysical(): boolean {
    return this.form.controls.collectionMethod.value === 'Physical Collection';
  }

  get regions(): string[] {
    const set = new Set(this.stations.map(s => s.region));
    return Array.from(set).sort();
  }

  getStationsForRegion(region: string): CollectionStation[] {
    return this.stations.filter(s => s.region === region && s.isActive);
  }

  constructor() {
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'Student') {
      this.router.navigate(['/login']);
      return;
    }

  }

  async ngOnInit(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'Student') {
      this.router.navigate(['/login']);
      return;
    }
    try {
      await this.paymentService.refreshStudentControlNumberRequests();
      const request = this.request;
      if (!request?.paymentBatchId || !await firstValueFrom(this.documentService.hasRequiredTranscriptDocuments(request.paymentBatchId))) {
        this.router.navigate(['/dashboard/student']);
        return;
      }
      this.form.patchValue({
        collectionMethod: (request.collectionMethod as any === 'Post' ? 'Post by DHL' : request.collectionMethod) ?? '',
        postingRegion: request.postingRegion ?? '',
        postingWard: request.postingWard ?? '',
        postingPoBox: request.postingPoBox ?? '',
        postingContactPhone: request.postingContactPhone ?? (user.phoneNumber || user.phone || ''),
        postingContactEmail: request.postingContactEmail ?? (user.email || ''),
        postingAddress: request.postingAddress ?? ''
      });
      this.loading = false;
    } catch {
      this.message = 'Unable to verify payment approval and required documents. Refresh and try again.';
      this.loading = false;
      return;
    }
    this.stationService.getActiveStations().subscribe({
      next: (list) => {
        this.stations = list;
        // Default to Main Campus if no station selected
        if (this.stations.length > 0 && !this.selectedStation) {
          this.onStationChange(this.stations[0].id);
        }
      },
      error: (err) => console.error('Error fetching collection stations', err)
    });
  }

  onStationChange(stationId: string): void {
    this.selectedStation = this.stations.find(s => s.id === stationId) || null;
    if (this.selectedStation) {
      this.form.patchValue({
        stationId: this.selectedStation.id,
        postingRegion: this.selectedStation.region,
        postingAddress: `${this.selectedStation.name} - ${this.selectedStation.address}`
      });
    }
  }

  onStationSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target && target.value) {
      this.onStationChange(target.value);
    }
  }

  async save(): Promise<void> {
    if (this.loading || !this.request?.paymentBatchId) {
      this.message = 'Payment approval and required documents must be verified before continuing.';
      return;
    }
    this.message = '';
    const val = this.form.getRawValue();
    const method = val.collectionMethod;

    if (!method) {
      this.form.markAllAsTouched();
      this.message = 'Please select a transcript collection method.';
      return;
    }

    if (method === 'Physical Collection' && !this.selectedStation) {
      this.message = 'Please select your preferred UDSM Collection Station / Regional Pickup Hub.';
      return;
    }

    if (method === 'Post by DHL') {
      if (!val.postingRegion.trim() || !val.postingWard.trim() || !val.postingPoBox.trim() || !val.postingContactPhone.trim()) {
        this.form.markAllAsTouched();
        this.message = 'Please fill out your Region, Ward/District, P.O. Box and Contact Phone Number for DHL delivery.';
        return;
      }
    }

    const fullSummaryAddress = method === 'Post by DHL'
      ? `P.O. Box: ${val.postingPoBox.trim()}, Ward/District: ${val.postingWard.trim()}, Region/City: ${val.postingRegion.trim()}. Contact Phone: ${val.postingContactPhone.trim()}, Email: ${val.postingContactEmail.trim()}. Notes: ${val.postingAddress.trim()}`
      : `Station: ${this.selectedStation?.name || 'UDSM Main Station'} (${this.selectedStation?.region || 'Dar es Salaam'}). Address: ${this.selectedStation?.address || 'DUS Building Room 102'}. Operating Hours: ${this.selectedStation?.operatingHours || 'Mon - Fri 08:00 - 16:00'}. Contact Phone: ${this.selectedStation?.contactPhone || '+255 22 2410500'}`;

    const region = method === 'Post by DHL'
      ? val.postingRegion.trim()
      : (this.selectedStation?.region || 'Dar es Salaam');

    const requestId = this.request?.paymentBatchId;
    if (!requestId) {
      this.message = 'Unable to save your collection preference.';
      return;
    }

    this.loading = true;
    try {
      await this.paymentService.saveCollectionPreference(requestId, {
        collectionMethod: method,
        collectionAddress: fullSummaryAddress,
        postingRegion: region,
        postingWard: val.postingWard.trim(),
        postingPoBox: val.postingPoBox.trim(),
        contactPhone: val.postingContactPhone.trim(),
        contactEmail: val.postingContactEmail.trim()
      });
    } catch {
      this.message = 'Unable to save your collection preference. Confirm your documents and try again.';
      this.loading = false;
      return;
    }
    this.loading = false;

    this.message = `Collection preference saved successfully! Allocated to: ${method === 'Physical Collection' ? this.selectedStation?.name : 'DHL Courier Service'}.`;
    setTimeout(() => this.router.navigate(['/transcript/process']), 1200);
  }
}
