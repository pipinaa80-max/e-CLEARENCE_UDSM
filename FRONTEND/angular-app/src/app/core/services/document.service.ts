import { Injectable } from '@angular/core';

import { DocumentItem } from '../models/document.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly storage = new StorageService();
  private readonly key = 'udsm-documents';

  uploadDocument(document: Omit<DocumentItem, 'id' | 'uploadedAt' | 'status'>): DocumentItem {
    const record: DocumentItem = {
      ...document,
      id: crypto.randomUUID(),
      uploadedAt: new Date().toISOString(),
      status: 'Pending'
    };

    const documents = this.getDocuments();
    documents.push(record);
    this.storage.save(this.key, documents);
    return record;
  }

  getDocuments(): DocumentItem[] {
    return this.storage.get<DocumentItem[]>(this.key) ?? [];
  }

  getStudentDocuments(studentId: string): DocumentItem[] {
    return this.getDocuments().filter((document) => document.studentId === studentId);
  }

  hasRequiredClearanceDocuments(studentId: string): boolean {
    const required = ['Transcript', 'O-Level Certificate', 'A-Level Certificate', 'Identity Document'];
    const uploaded = this.getStudentDocuments(studentId).map((document) => document.fileType);
    return required.every((type) => uploaded.includes(type));
  }

  approveDocument(id: string): DocumentItem | null {
    const documents = this.getDocuments();
    const found = documents.find((document) => document.id === id);
    if (!found) {
      return null;
    }

    found.status = 'Approved';
    found.verifiedAt = new Date().toISOString();
    this.storage.save(this.key, documents);
    return found;
  }

  rejectDocument(id: string, comment: string): DocumentItem | null {
    const documents = this.getDocuments();
    const found = documents.find((document) => document.id === id);
    if (!found) {
      return null;
    }

    found.status = 'Rejected';
    found.comment = comment;
    found.verifiedAt = new Date().toISOString();
    this.storage.save(this.key, documents);
    return found;
  }

  deleteDocument(id: string): boolean {
    const documents = this.getDocuments().filter((document) => document.id !== id);
    this.storage.save(this.key, documents);
    return true;
  }
}
