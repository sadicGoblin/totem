import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CatalogueService } from '../../services/catalogue.service';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit, OnDestroy {
  private refreshTimeout: any;
  private readonly REFRESH_DELAY = 5 * 60 * 1000; // 5 minutos

  constructor(
    private router: Router,
    private catalogueService: CatalogueService
  ) {}

  ngOnInit(): void {
    // Programar refresh del catálogo después de 5 minutos en el screensaver
    this.refreshTimeout = setTimeout(() => {
      console.log('🔄 Refreshing catalogue after 5 minutes on welcome screen...');
      this.catalogueService.refreshCatalogue();
    }, this.REFRESH_DELAY);
  }

  ngOnDestroy(): void {
    // Cancelar el refresh si el usuario sale del screensaver
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  navigateToCatalog() {
    this.router.navigate(['/home']);
  }
}
