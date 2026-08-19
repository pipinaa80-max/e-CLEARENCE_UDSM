import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, of, map } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import {
  DocumentService,
  Document
} from '../../core/services/document.service';

@Component({
  selector: 'app-documents-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './documents-list.html',
  styleUrl: './documents-list.css'
})
export class DocumentsListComponent {

  private readonly authService = inject(AuthService);
  private readonly documentService = inject(DocumentService);

  documents$: Observable<Document[]> = of([]);

  constructor() {
    const user = this.authService.getCurrentUser();

    if (user) {
      this.documents$ = this.documentService
          .getStudentDocuments(user.id)
          .pipe(
              map(response => response.content)
          );
    }
  }
}