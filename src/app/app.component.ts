import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminDialogComponent } from './components/admin-dialog/admin-dialog.component';
import { ScreenOrientationComponent } from './components/screen-orientation/screen-orientation.component';
import { IdleService } from './services/idle.service';
import { ConfigService } from './services/config.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AdminDialogComponent, ScreenOrientationComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'totem';
  
  constructor(
    private idleService: IdleService,
    private configService: ConfigService
  ) {
    this.idleService.startWatching();
  }

  ngOnInit(): void {
    // Cargar configuración del cliente al iniciar la app
    // Si ya existe en localStorage, se cargará automáticamente en el constructor del servicio
    // Aquí forzamos una actualización desde la API
    const clientSlug = environment.clientSlug || 'liquidos';
    
    this.configService.loadConfig(clientSlug).subscribe({
      next: (config) => {
        console.log('Configuración global cargada:', config);
      },
      error: (error) => {
        console.error('Error cargando configuración global:', error);
      }
    });
  }

}
