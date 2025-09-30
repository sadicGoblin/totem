import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { ConfigService } from './services/config.service';
import { getActiveClientSlug } from './config/client.config';

/**
 * Factory function para inicializar la configuración del cliente
 * @param configService Servicio de configuración
 * @returns Función que carga la configuración
 */
export function initializeApp(configService: ConfigService): () => Promise<any> {
  return (): Promise<any> => {
    const clientSlug = getActiveClientSlug();
    console.log('Inicializando aplicación con cliente:', clientSlug);
    
    return new Promise((resolve, reject) => {
      configService.loadConfig(clientSlug).subscribe({
        next: (config) => {
          console.log('Configuración cargada exitosamente:', config);
          resolve(config);
        },
        error: (error) => {
          console.error('Error cargando configuración inicial:', error);
          // Resolver de todas formas para no bloquear la aplicación
          resolve(null);
        }
      });
    });
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [ConfigService],
      multi: true
    }
  ],
};
