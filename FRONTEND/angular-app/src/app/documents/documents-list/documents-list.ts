import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DocumentService } from '../../core/services/document.service';

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
  get documents() { const user = this.authService.getCurrentUser(); return user ? this.documentService.getStudentDocuments(user.id) : []; }
}
