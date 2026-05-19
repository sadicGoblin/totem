import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CatalogueService } from '../../services/catalogue.service';
import { CLIENT_CONFIG } from '../../../config/client.config';

/**
 * Pantalla de bienvenida estática (atract screen).
 * Se muestra al arrancar y al terminar una compra.
 * Toque en pantalla → /home.
 * El IdleService la reemplaza con /idle (videos) tras inactividad.
 */
@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit, OnDestroy {
  storeName = '';
  storeLogo = '';
  tagline = 'Pide sin filas.';
  subtitle = 'Coctelería de autor, cervezas y destilados. Paga acá y retira directo en la barra.';
  ctaLabel = 'TOCAR PARA COMENZAR';
  statusLabel = 'ABIERTO';

  currentTime = '';
  private clockInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private router: Router,
    private catalogueService: CatalogueService
  ) {}

  ngOnInit(): void {
    const org = this.catalogueService.getOrganization();
    this.storeName = org?.name || CLIENT_CONFIG.branding.storeName || 'TICKETPRO';
    this.storeLogo = CLIENT_CONFIG.branding.logoUrl || '';

    // Reloj live en formato HH:MM (24h)
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 30 * 1000);

    // Overrides opcionales desde metadata.texts (esquema post-migración 0013).
    this.tagline = this.catalogueService.getMetadata<string>('texts.welcome.tagline', this.tagline);
    this.subtitle = this.catalogueService.getMetadata<string>('texts.welcome.subtitle', this.subtitle);
    this.ctaLabel = this.catalogueService.getMetadata<string>('texts.welcome.ctaLabel', this.ctaLabel);
    this.statusLabel = this.catalogueService.getMetadata<string>('texts.welcome.statusLabel', this.statusLabel);
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }

  private updateClock(): void {
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    this.currentTime = `${hh}:${mm}`;
  }

  navigateToHome(): void {
    this.router.navigate(['/home']);
  }
}
