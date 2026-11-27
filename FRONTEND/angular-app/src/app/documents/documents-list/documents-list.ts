import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { ConfigService } from '../../core/services/config.service';
import {
  DocumentService,
  Document
} from '../../core/services/document.service';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';
import { StudentSidebarComponent } from '../../shared/components/student-sidebar/student-sidebar';

@Component({
  selector: 'app-documents-list',
  standalone: true,
  imports: [CommonModule, RouterLink, DashboardHeaderComponent, StudentSidebarComponent],
  templateUrl: './documents-list.html',
  styleUrl: './documents-list.css'
})
export class DocumentsListComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly documentService = inject(DocumentService);
  private readonly configService = inject(ConfigService);
  private readonly router = inject(Router);

  sidebarOpen = false;
  isLoading = true;
  errorMessage = '';
  documents: Document[] = [];

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    const user = this.currentUser;
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadDocuments(user.id);
  }

  loadDocuments(studentId: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.documentService
      .getStudentDocuments(studentId, 0, 50)
      .pipe(
        catchError(() => {
          this.errorMessage = 'Could not load uploaded documents right now. Please try again.';
          return of({ content: [], totalElements: 0, totalPages: 0, size: 50, number: 0 });
        })
      )
      .subscribe(response => {
        this.documents = response?.content || [];
        this.isLoading = false;
      });
  }

  getDocumentUrl(doc: Document): string {
    if (!doc.fileUrl) return '';
    if (/^https?:\/\//i.test(doc.fileUrl) || doc.fileUrl.startsWith('data:')) {
      return doc.fileUrl;
    }
    const base = this.configService.apiUrl.replace(/\/api\/v1\/?$/, '');
    return `${base}${doc.fileUrl.startsWith('/') ? '' : '/'}${doc.fileUrl}`;
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }
}
