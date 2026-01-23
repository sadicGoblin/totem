import { Injectable, Inject, forwardRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom, interval, Subscription } from 'rxjs';
import { CLIENT_CONFIG } from '../../config/client.config';
import { ThemeService } from './theme.service';

// ==================== Interfaces ====================

export interface Organization {
  id: number;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  created: string;
  modified: string;
}

export interface Catalogue {
  id: number;
  organization: number;
  name: string;
  slug: string;
  code: string;
  description?: string;
  currency: 'CLP' | 'USD' | 'EUR' | 'ARS' | 'BRL' | 'MXN' | 'COP' | 'PEN';
  is_active: boolean;
  created: string;
  modified: string;
}

export interface CurrencyInfo {
  code: string;
  symbol: string;
  decimals: number;
  decimal_separator: string;
  thousands_separator: string;
}

export interface Brand {
  id: number;
  organization: number;
  name: string;
  slug: string;
  description?: string;
  tags?: string;
  image?: string;
  parent?: number;
  style?: string;
  state: 'publish' | 'draft' | 'pending';
  order: number;
  created: string;
  modified: string;
}

export interface Category {
  id: number;
  organization: number;
  name: string;
  slug: string;
  description?: string;
  tags?: string;
  image?: string;
  icon_file?: string;
  parent?: number;
  style?: string;
  state: 'publish' | 'draft' | 'pending';
  virtual: boolean;
  order: number;
  created: string;
  modified: string;
}

export interface ProductImage {
  id: number;
  image: string;
}

export interface Product {
  id: number;
  catalogue: number;
  name: string;
  slug: string;
  sku?: string;
  description?: string;
  short_description?: string;
  image?: string; // Imagen principal del producto
  tags?: string;
  tags_list?: string[];
  
  // Precios
  price_1?: string;
  price_1_formatted?: string;
  price_2?: string;
  price_2_formatted?: string;
  currency: string;
  currency_info?: CurrencyInfo;
  
  // Stock
  stock_quantity: number;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  manage_stock: boolean;
  
  // Relaciones
  brand?: Brand;
  categories?: Category[];
  images?: ProductImage[];
  variations?: Product[];
  parent?: number;
  
  // Dimensiones
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  
  // Estado
  state: 'publish' | 'draft' | 'pending';
  virtual: boolean;
  is_removed: boolean;
  
  // Fechas
  created: string;
  modified: string;
}

export interface Slide {
  id: number;
  catalogue: number;
  name: string;
  slug: string;
  description?: string;
  tags?: string;
  image?: string;
  link?: string;
  button_text?: string;
  order: number;
  state: 'publish' | 'draft' | 'pending';
  virtual: boolean;
  created: string;
  modified: string;
}

export interface ClientConfiguration {
  id: number;
  catalogue?: number;
  name: string;
  domain: string;
  description?: string;
  primary_color: string;
  secondary_color: string;
  accent_color?: string;
  logo?: string;
  favicon?: string;
  logo_url?: string;
  favicon_url?: string;
  metadata?: Record<string, any>;
  is_active: boolean;
  created: string;
  modified: string;
}

export interface PlaylistVideo {
  id: number;
  name: string;
  description?: string;
  file: string;
  file_url: string;
  thumbnail?: string;
  thumbnail_url?: string;
  orientation: 'vertical' | 'horizontal';
  duration: number;
  order: number;
  is_active: boolean;
  created: string;
  modified: string;
}

export interface Playlist {
  id: number;
  name: string;
  slug: string;
  description?: string;
  duration: number;
  order: number;
  videos: PlaylistVideo[];
}

export interface Playlists {
  vertical: Playlist[];
  horizontal: Playlist[];
}

export interface CompleteCatalogue {
  catalogue: Catalogue;
  organization: Organization;
  products: Product[];
  categories: Category[];
  brands: Brand[];
  slides: Slide[];
  client_configuration: ClientConfiguration | null;
  playlists?: Playlists;
}

// ==================== Service ====================

@Injectable({
  providedIn: 'root'
})
export class CatalogueService {
  private catalogueData: CompleteCatalogue | null = null;
  private isLoaded = false;
  private isLoading = false;
  private refreshSubscription: Subscription | null = null;
  private lastLoadTime: Date | null = null;
  
  // Clave para almacenamiento local
  private readonly STORAGE_KEY = 'totem_catalogue_cache';
  private readonly STORAGE_TIMESTAMP_KEY = 'totem_catalogue_timestamp';

  // Observable para notificar cuando el catálogo se actualiza
  private catalogueSubject = new BehaviorSubject<CompleteCatalogue | null>(null);
  public catalogue$ = this.catalogueSubject.asObservable();

  // Observable para el estado de carga
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(
    private http: HttpClient,
    private themeService: ThemeService
  ) {}

  /**
   * Guarda el catálogo en localStorage
   */
  private saveCatalogueToStorage(data: CompleteCatalogue): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(this.STORAGE_TIMESTAMP_KEY, new Date().toISOString());
      console.log('💾 Catalogue saved to localStorage');
    } catch (error) {
      console.warn('⚠️ Failed to save catalogue to localStorage:', error);
    }
  }

  /**
   * Carga el catálogo desde localStorage
   */
  private loadCatalogueFromStorage(): CompleteCatalogue | null {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      const timestamp = localStorage.getItem(this.STORAGE_TIMESTAMP_KEY);
      
      if (data) {
        console.log('📦 Loading catalogue from localStorage (cached at:', timestamp, ')');
        return JSON.parse(data) as CompleteCatalogue;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load catalogue from localStorage:', error);
    }
    return null;
  }

  /**
   * Carga inicial del catálogo - se llama desde APP_INITIALIZER
   */
  async loadCatalogue(): Promise<void> {
    if (this.isLoaded || this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.loadingSubject.next(true);

    try {
      const url = `${CLIENT_CONFIG.apiBase}/catalogue/${CLIENT_CONFIG.catalogueCode}/`;
      const response = await firstValueFrom(
        this.http.get<CompleteCatalogue>(url)
      );

      if (response) {
        this.catalogueData = response;
        this.catalogueSubject.next(response);
        this.applyClientConfiguration(response.client_configuration);
        this.lastLoadTime = new Date();
        this.isLoaded = true;
        
        // Guardar en localStorage para modo offline
        this.saveCatalogueToStorage(response);
        
        console.log('✅ Catalogue loaded successfully:', {
          code: response.catalogue?.code,
          products: response.products?.length,
          categories: response.categories?.length,
          brands: response.brands?.length,
          loadedAt: this.lastLoadTime.toISOString()
        });
      }

      // Ya no iniciamos refresh automático - solo se actualiza cuando el usuario está en el screensaver

    } catch (error) {
      console.error('❌ Failed to load catalogue from API:', error);
      
      // Intentar cargar desde localStorage si la API falla
      const cachedData = this.loadCatalogueFromStorage();
      if (cachedData) {
        this.catalogueData = cachedData;
        this.catalogueSubject.next(cachedData);
        this.applyClientConfiguration(cachedData.client_configuration);
        console.log('📦 Using cached catalogue data (offline mode)');
      } else {
        console.error('❌ No cached data available');
      }
      
      this.isLoaded = true; // Marcar como cargado para no bloquear la app
    } finally {
      this.isLoading = false;
      this.loadingSubject.next(false);
    }
  }

  /**
   * Refresca el catálogo manualmente
   */
  async refreshCatalogue(): Promise<void> {
    if (this.isLoading) {
      console.log('⏳ Catalogue refresh already in progress...');
      return;
    }

    this.isLoading = true;
    this.loadingSubject.next(true);

    try {
      const url = `${CLIENT_CONFIG.apiBase}/catalogue/${CLIENT_CONFIG.catalogueCode}/`;
      const response = await firstValueFrom(
        this.http.get<CompleteCatalogue>(url)
      );

      if (response) {
        this.catalogueData = response;
        this.catalogueSubject.next(response);
        this.applyClientConfiguration(response.client_configuration);
        this.lastLoadTime = new Date();
        
        // Guardar en localStorage para modo offline
        this.saveCatalogueToStorage(response);
        
        console.log('🔄 Catalogue refreshed at:', this.lastLoadTime.toISOString());
      }

    } catch (error) {
      console.error('❌ Failed to refresh catalogue:', error);
    } finally {
      this.isLoading = false;
      this.loadingSubject.next(false);
    }
  }

  /**
   * Inicia la actualización periódica del catálogo
   */
  private startPeriodicRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }

    const intervalMs = CLIENT_CONFIG.catalogueRefreshInterval;
    console.log(`⏰ Starting periodic catalogue refresh every ${intervalMs / 1000} seconds`);

    this.refreshSubscription = interval(intervalMs).subscribe(() => {
      console.log('🔄 Periodic catalogue refresh triggered...');
      this.refreshCatalogue();
    });
  }

  /**
   * Detiene la actualización periódica
   */
  stopPeriodicRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = null;
      console.log('⏹️ Periodic catalogue refresh stopped');
    }
  }

  /**
   * Aplica la configuración del cliente (colores, logo, etc.)
   */
  private applyClientConfiguration(config: ClientConfiguration | null): void {
    if (!config) {
      console.warn('⚠️ No client configuration found, using defaults');
      this.applyCssVariables();
      return;
    }

    // Actualizar CLIENT_CONFIG con los datos de la API
    if (config.primary_color) {
      CLIENT_CONFIG.branding.primaryColor = config.primary_color;
    }
    if (config.secondary_color) {
      CLIENT_CONFIG.branding.secondaryColor = config.secondary_color;
    }
    if (config.accent_color) {
      CLIENT_CONFIG.branding.accentColor = config.accent_color;
    }
    if (config.logo_url || config.logo) {
      CLIENT_CONFIG.branding.logoUrl = config.logo_url || config.logo || '';
    }
    if (config.favicon_url || config.favicon) {
      CLIENT_CONFIG.branding.faviconUrl = config.favicon_url || config.favicon || '';
    }
    if (config.name) {
      CLIENT_CONFIG.branding.storeName = config.name;
    }

    // Aplicar variables CSS
    this.applyCssVariables();

    // Cargar metadata del tema si existe
    if (config.metadata) {
      this.themeService.loadFromAPIMetadata(config.metadata);
    }

    console.log('🎨 Client configuration applied:', {
      primaryColor: CLIENT_CONFIG.branding.primaryColor,
      secondaryColor: CLIENT_CONFIG.branding.secondaryColor,
      storeName: CLIENT_CONFIG.branding.storeName,
      hasMetadata: !!config.metadata
    });
  }

  /**
   * Aplica los colores como variables CSS en el documento
   */
  private applyCssVariables(): void {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', CLIENT_CONFIG.branding.primaryColor);
    root.style.setProperty('--secondary-color', CLIENT_CONFIG.branding.secondaryColor);
    root.style.setProperty('--light-color', CLIENT_CONFIG.branding.lightColor);
    root.style.setProperty('--accent-color', CLIENT_CONFIG.branding.accentColor);
  }

  // ==================== Getters para datos del catálogo ====================

  /**
   * Obtiene el catálogo completo
   */
  getCatalogue(): CompleteCatalogue | null {
    return this.catalogueData;
  }

  /**
   * Obtiene información del catálogo
   */
  getCatalogueInfo(): Catalogue | null {
    return this.catalogueData?.catalogue || null;
  }

  /**
   * Obtiene información de la organización
   */
  getOrganization(): Organization | null {
    return this.catalogueData?.organization || null;
  }

  /**
   * Obtiene todos los productos
   */
  getProducts(): Product[] {
    return this.catalogueData?.products || [];
  }

  /**
   * Obtiene productos por categoría
   */
  getProductsByCategory(categoryId: number): Product[] {
    return this.getProducts().filter(product => 
      product.categories?.some(cat => cat.id === categoryId)
    );
  }

  /**
   * Obtiene productos por marca
   */
  getProductsByBrand(brandId: number): Product[] {
    return this.getProducts().filter(product => 
      product.brand?.id === brandId
    );
  }

  /**
   * Busca productos por nombre o SKU
   */
  searchProducts(query: string): Product[] {
    const lowerQuery = query.toLowerCase();
    return this.getProducts().filter(product => 
      product.name.toLowerCase().includes(lowerQuery) ||
      product.sku?.toLowerCase().includes(lowerQuery) ||
      product.tags?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Obtiene un producto por ID
   */
  getProductById(id: number): Product | undefined {
    return this.getProducts().find(product => product.id === id);
  }

  /**
   * Obtiene todas las categorías
   */
  getCategories(): Category[] {
    return this.catalogueData?.categories || [];
  }

  /**
   * Obtiene una categoría por ID
   */
  getCategoryById(id: number): Category | undefined {
    return this.getCategories().find(category => category.id === id);
  }

  /**
   * Obtiene categorías raíz (sin padre)
   */
  getRootCategories(): Category[] {
    return this.getCategories().filter(cat => !cat.parent);
  }

  /**
   * Obtiene subcategorías de una categoría padre
   */
  getSubcategories(parentId: number): Category[] {
    return this.getCategories().filter(cat => cat.parent === parentId);
  }

  /**
   * Obtiene todas las marcas
   */
  getBrands(): Brand[] {
    return this.catalogueData?.brands || [];
  }

  /**
   * Obtiene una marca por ID
   */
  getBrandById(id: number): Brand | undefined {
    return this.getBrands().find(brand => brand.id === id);
  }

  /**
   * Obtiene todos los slides/banners
   */
  getSlides(): Slide[] {
    return this.catalogueData?.slides || [];
  }

  /**
   * Obtiene todas las playlists
   */
  getPlaylists(): Playlists | null {
    return this.catalogueData?.playlists || null;
  }

  /**
   * Obtiene las playlists verticales
   */
  getVerticalPlaylists(): Playlist[] {
    return this.catalogueData?.playlists?.vertical || [];
  }

  /**
   * Obtiene las playlists horizontales
   */
  getHorizontalPlaylists(): Playlist[] {
    return this.catalogueData?.playlists?.horizontal || [];
  }

  /**
   * Obtiene los videos de la primera playlist vertical (para screensaver)
   */
  getScreensaverVideos(): PlaylistVideo[] {
    const verticalPlaylists = this.getVerticalPlaylists();
    if (verticalPlaylists.length > 0) {
      return verticalPlaylists[0].videos.filter(v => v.is_active).sort((a, b) => a.order - b.order);
    }
    return [];
  }

  /**
   * Obtiene la configuración del cliente
   */
  getClientConfiguration(): ClientConfiguration | null {
    return this.catalogueData?.client_configuration || null;
  }

  /**
   * Obtiene la configuración de branding actual
   */
  getBranding() {
    return CLIENT_CONFIG.branding;
  }

  /**
   * Verifica si el catálogo está cargado
   */
  isDataLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Obtiene la fecha de última carga
   */
  getLastLoadTime(): Date | null {
    return this.lastLoadTime;
  }

  /**
   * Obtiene la moneda del catálogo
   */
  getCurrency(): string {
    return this.catalogueData?.catalogue?.currency || 'CLP';
  }

  /**
   * Obtiene un valor de metadata con un valor por defecto
   * @param key Clave en formato dot notation (ej: 'texts.category_title')
   * @param defaultValue Valor por defecto si no existe
   */
  getMetadata<T>(key: string, defaultValue: T): T {
    const metadata = this.catalogueData?.client_configuration?.metadata;
    if (!metadata) return defaultValue;
    
    const keys = key.split('.');
    let value: any = metadata;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    
    return value as T ?? defaultValue;
  }
}
