import { Injectable } from '@angular/core';
import { CLIENT_CONFIG } from '../../config/client.config';
import { CatalogueService } from './catalogue.service';

/**
 * @deprecated Use CatalogueService instead
 * Este servicio se mantiene por compatibilidad pero delega al CatalogueService
 */
@Injectable({
  providedIn: 'root'
})
export class ClientConfigService {
  constructor(private catalogueService: CatalogueService) {}

  /**
   * @deprecated Use CatalogueService.loadCatalogue() instead
   */
  async loadConfig(): Promise<void> {
    return this.catalogueService.loadCatalogue();
  }

  /**
   * Obtiene la configuración actual del branding
   */
  getBranding() {
    return CLIENT_CONFIG.branding;
  }

  /**
   * Verifica si la configuración ya fue cargada
   */
  isLoaded(): boolean {
    return this.catalogueService.isDataLoaded();
  }
}
