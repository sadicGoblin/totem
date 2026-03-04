import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CLIENT_CONFIG } from '../../config/client.config';

@Injectable({
  providedIn: 'root'
})
export class BaseApiService {
  private baseUrl = CLIENT_CONFIG.apiBase;
  private catalogueCode = CLIENT_CONFIG.catalogueCode;

  constructor(private http: HttpClient) {}

  /**
   * Agrega automáticamente el catalogue__code a todas las requests
   * @param endpoint Endpoint de la API
   * @param params Parámetros adicionales opcionales
   */
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(`${this.baseUrl}/${endpoint}`);
    
    // Agregar catalogue__code automáticamente para filtrar por catálogo
    url.searchParams.set('catalogue__code', this.catalogueCode);
    
    // Agregar parámetros adicionales si existen
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  /**
   * GET request genérico que agrega automáticamente catalogue__code
   */
  get<T>(endpoint: string, params?: Record<string, any>): Observable<T> {
    const fullUrl = this.buildUrl(endpoint, params);
    return this.http.get<T>(fullUrl);
  }

  /**
   * POST request genérico que agrega automáticamente catalogue__code
   */
  post<T>(endpoint: string, body: any, params?: Record<string, any>): Observable<T> {
    const fullUrl = this.buildUrl(endpoint, params);
    return this.http.post<T>(fullUrl, body);
  }

  /**
   * PUT request genérico que agrega automáticamente catalogue__code
   */
  put<T>(endpoint: string, body: any, params?: Record<string, any>): Observable<T> {
    const fullUrl = this.buildUrl(endpoint, params);
    return this.http.put<T>(fullUrl, body);
  }

  /**
   * DELETE request genérico que agrega automáticamente catalogue__code
   */
  delete<T>(endpoint: string, params?: Record<string, any>): Observable<T> {
    const fullUrl = this.buildUrl(endpoint, params);
    return this.http.delete<T>(fullUrl);
  }

  /**
   * Getter para acceder a la configuración del cliente
   */
  get clientConfig() {
    return CLIENT_CONFIG;
  }

  /**
   * Getter para el código del catálogo actual
   */
  get currentCatalogueCode(): string {
    return this.catalogueCode;
  }
}
