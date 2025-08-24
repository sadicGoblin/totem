import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent {
  logoExists = true; // Propiedad para controlar la visibilidad del logo

  constructor(private router: Router) {}

  navigateToCatalog() {
    this.router.navigate(['/category']);
  }
}
