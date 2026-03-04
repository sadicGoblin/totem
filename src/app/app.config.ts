import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { CatalogueService } from './services/catalogue.service';

function initializeApp(catalogueService: CatalogueService) {
  return () => catalogueService.loadCatalogue();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [CatalogueService],
      multi: true
    }
  ],
};
