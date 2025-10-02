import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ClientConfig {
  id: number;
  name: string;
  slug?: string;
  organization_id: number;
  primary_color: string;
  secondary_color: string;
  accent_color?: string;
  logo: string; // URL del logo
  logo_url?: string; // URL alternativa del logo
  favicon?: string;
  favicon_url?: string; // URL alternativa del favicon
  welcome_message?: string;
  contact_info?: string;
  created_at?: string;
  updated_at?: string;
  is_active: boolean;
  domain?: string;
  description?: string;
  created?: string;
  modified?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private readonly STORAGE_KEY = 'client_config';
  private configSubject = new BehaviorSubject<ClientConfig | null>(null);
  public config$ = this.configSubject.asObservable();
  
  // Getter para acceso directo a la configuración actual
  public get config(): ClientConfig | null {
    return this.configSubject.value;
  }

  constructor(private http: HttpClient) {
    // Cargar configuración desde localStorage al iniciar
    this.loadFromStorage();
  }

  /**
   * Carga configuración desde localStorage si existe
   */
  private loadFromStorage(): void {
    try {
      const storedConfig = localStorage.getItem(this.STORAGE_KEY);
      if (storedConfig) {
        const config: ClientConfig = JSON.parse(storedConfig);
        this.configSubject.next(config);
        this.applyCSSVariables(config);
        console.log('Configuración cargada desde localStorage:', config);
      }
    } catch (error) {
      console.error('Error al cargar configuración desde localStorage:', error);
    }
  }

  /**
   * Guarda configuración en localStorage
   */
  private saveToStorage(config: ClientConfig): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Error al guardar configuración en localStorage:', error);
    }
  }

  /**
   * Carga la configuración del cliente desde la API
   * @returns Observable con la configuración del cliente
   */
  loadConfig(clientSlug: string): Observable<ClientConfig> {
    const apiUrl = `${environment.apiUrl}/api/client-config/${clientSlug}/`;
    
    return this.http.get<ClientConfig>(apiUrl).pipe(
      tap(config => {
        this.configSubject.next(config);
        this.saveToStorage(config); // Guardar en localStorage
        console.log('Configuración cargada desde API:', config);
        
        // Aplicar colores CSS dinámicamente
        this.applyCSSVariables(config);
      }),
      catchError(error => {
        console.error('Error cargando configuración del cliente:', error);
        // En caso de error, usar configuración por defecto
        const defaultConfig: ClientConfig = {
          id: 0,
          name: 'Cliente Default',
          slug: clientSlug,
          organization_id: 1,
          primary_color: '#000000',
          secondary_color: '#FFD700',
          logo: 'assets/images/default-logo.png',
          is_active: true
        };
        this.configSubject.next(defaultConfig);
        this.applyCSSVariables(defaultConfig);
        return of(defaultConfig);
      })
    );
  }

  /**
   * Aplica las variables CSS dinámicas al documento
   * @param config Configuración del cliente
   */
  private applyCSSVariables(config: ClientConfig): void {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', config.primary_color);
    root.style.setProperty('--secondary-color', config.secondary_color);
    
    // Generar variaciones de colores más claros
    root.style.setProperty('--primary-color-light', this.lightenColor(config.primary_color, 10));
    root.style.setProperty('--secondary-color-light', this.lightenColor(config.secondary_color, 10));
    
    if (config.accent_color) {
      root.style.setProperty('--accent-color', config.accent_color);
    }

    // También podemos aplicar el favicon dinámicamente
    if (config.favicon) {
      this.updateFavicon(config.favicon);
    }
  }

  /**
   * Aclara un color hexadecimal en un porcentaje dado
   * @param hex Color en formato hexadecimal
   * @param percent Porcentaje de aclarado (0-100)
   * @returns Color aclarado en formato hexadecimal
   */
  private lightenColor(hex: string, percent: number): string {
    // Remover el # si existe
    hex = hex.replace('#', '');
    
    // Convertir a RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calcular los nuevos valores RGB aclarados
    const newR = Math.min(255, Math.round(r + (255 - r) * (percent / 100)));
    const newG = Math.min(255, Math.round(g + (255 - g) * (percent / 100)));
    const newB = Math.min(255, Math.round(b + (255 - b) * (percent / 100)));
    
    // Convertir de vuelta a hexadecimal
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
  }

  /**
   * Actualiza el favicon dinámicamente
   * @param faviconUrl URL del favicon
   */
  private updateFavicon(faviconUrl: string): void {
    const link: HTMLLinkElement = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = faviconUrl;
    document.getElementsByTagName('head')[0].appendChild(link);
  }

  /**
   * Obtiene el ID de organización del cliente actual
   * @returns ID de organización o null si no hay configuración
   */
  getOrganizationId(): number | null {
    return this.config?.organization_id || null;
  }

  /**
   * Verifica si hay una configuración cargada
   * @returns true si hay configuración, false en caso contrario
   */
  isConfigLoaded(): boolean {
    return this.config !== null;
  }

  /**
   * Obtiene los colores del cliente actual
   * @returns Objeto con los colores o colores por defecto
   */
  getColors(): { primary: string; secondary: string; accent?: string } {
    if (!this.config) {
      return { primary: '#000000', secondary: '#FFD700' };
    }
    
    return {
      primary: this.config.primary_color,
      secondary: this.config.secondary_color,
      accent: this.config.accent_color
    };
  }
}