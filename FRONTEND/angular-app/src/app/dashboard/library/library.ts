import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-library-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './library.html',
  styleUrl: './library.css'
})
export class LibraryDashboard {
  private readonly authService = inject(AuthService); private readonly router = inject(Router);
  sidebarOpen = false;

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
