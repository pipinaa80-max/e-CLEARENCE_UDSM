import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { TranscriptPaymentService } from '../core/services/transcript-payment.service';
import { CollectionStationService, CollectionStation } from '../core/services/collection-station.service';
import { DashboardHeaderComponent } from '../shared/components/dashboard-header/dashboard-header';

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
  private readonly stationService = inject(CollectionStationService);
  private readonly router = inject(Router);

  sidebarOpen = false;
  message = '';
  stations: CollectionStation[] = [];
  selectedStation: CollectionStation | null = null;

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
    return requests.some(r => r.attemptNumber === 1 && r.status === 'Paid');
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
    return user ? this.paymentService.getStudentRequests(user.id).at(-1) ?? null : null;
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

    if (!this.request || this.request.status !== 'Paid') {
      this.router.navigate(['/transcript/payment']);
      return;
    }

    this.form.patchValue({
      collectionMethod: (this.request.collectionMethod as any === 'Post' ? 'Post by DHL' : this.request.collectionMethod) ?? '',
      postingRegion: this.request.postingRegion ?? '',
      postingWard: this.request.postingWard ?? '',
      postingPoBox: this.request.postingPoBox ?? '',
      postingContactPhone: this.request.postingContactPhone ?? (user.phoneNumber || user.phone || ''),
      postingContactEmail: this.request.postingContactEmail ?? (user.email || ''),
      postingAddress: this.request.postingAddress ?? ''
    });
  }

  ngOnInit(): void {
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

  save(): void {
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

    if (!this.request || !this.paymentService.updateCollectionDetails(
      this.request.id,
      method,
      fullSummaryAddress,
      region,
      val.postingWard.trim(),
      val.postingPoBox.trim(),
      val.postingContactPhone.trim(),
      val.postingContactEmail.trim()
    )) {
      this.message = 'Unable to save your collection preference.';
      return;
    }

    this.message = `Collection preference saved successfully! Allocated to: ${method === 'Physical Collection' ? this.selectedStation?.name : 'DHL Courier Service'}.`;
    setTimeout(() => this.router.navigate(['/transcript/process']), 2000);
  }
}
