import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div *ngFor="let toast of toasts"
           class="toast-item"
           [ngClass]="toast.type"
           (click)="remove(toast.id)">
        <div class="toast-icon">
          <span *ngIf="toast.type === 'success'">✓</span>
          <span *ngIf="toast.type === 'error'">✕</span>
          <span *ngIf="toast.type === 'warning'">!</span>
          <span *ngIf="toast.type === 'info'">ℹ</span>
        </div>
        <div class="toast-content">
          <div class="toast-title">{{ toast.title }}</div>
          <div class="toast-message">{{ toast.message }}</div>
        </div>
        <button class="toast-close">&times;</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }
    .toast-item {
      pointer-events: auto;
      width: 320px;
      padding: 15px;
      border-radius: 8px;
      background: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: flex-start;
      gap: 12px;
      cursor: pointer;
      animation: slideIn 0.3s ease-out forwards;
      border-left: 5px solid #ccc;
    }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .toast-item.success { border-left-color: #28a745; }
    .toast-item.error { border-left-color: #dc3545; }
    .toast-item.warning { border-left-color: #ffc107; }
    .toast-item.info { border-left-color: #17a2b8; }

    .toast-icon {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: white;
    }
    .success .toast-icon { background: #28a745; }
    .error .toast-icon { background: #dc3545; }
    .warning .toast-icon { background: #ffc107; }
    .info .toast-icon { background: #17a2b8; }

    .toast-content { flex-grow: 1; }
    .toast-title { font-weight: bold; margin-bottom: 4px; font-size: 0.95rem; }
    .toast-message { font-size: 0.85rem; color: #666; }
    .toast-close {
      background: none;
      border: none;
      font-size: 1.2rem;
      color: #999;
      padding: 0;
      line-height: 1;
    }
  `]
})
export class ToastComponent implements OnInit {
  private toastService = inject(ToastService);
  toasts: ToastMessage[] = [];

  ngOnInit() {
    this.toastService.getToasts().subscribe(toasts => {
      this.toasts = toasts;
    });
  }

  remove(id: number) {
    this.toastService.remove(id);
  }
}
