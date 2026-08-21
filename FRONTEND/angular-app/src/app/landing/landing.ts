import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  templateUrl: './landing.html',
  styleUrl: './landing.css'
})
export class Landing {
  private readonly router = inject(Router);

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
