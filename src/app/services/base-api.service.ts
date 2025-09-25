import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CLIENT_CONFIG } from '../../config/client.config';

@Injectable({
  providedIn: 'root'
})
export class BaseApiService {
  private baseUrl = CLIENT_CONFIG.apiBase;
  private orgSlug = CLIENT_CONFIG.organizationSlug;

  constructor(private http: HttpClient) {}

  /**
   * Agrega automáticamente el org_slug a todas las requests
   * @param endpoint Endpoint de la API
   * @param params Parámetros adicionales opcionales
   */
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(`${this.baseUrl}/${endpoint}`);
    
    // Agregar org_slug automáticamente
    url.searchParams.set('org_slug', this.orgSlug);
    
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
   * GET request genérico que agrega automáticamente org_slug
   */
  get<T>(endpoint: string, params?: Record<string, any>): Observable<T> {
    const fullUrl = this.buildUrl(endpoint, params);
    return this.http.get<T>(fullUrl);
  }

  /**
   * POST request genérico que agrega automáticamente org_slug
   */
  post<T>(endpoint: string, body: any, params?: Record<string, any>): Observable<T> {
    const fullUrl = this.buildUrl(endpoint, params);
    return this.http.post<T>(fullUrl, body);
  }

  /**
   * PUT request genérico que agrega automáticamente org_slug
   */
  put<T>(endpoint: string, body: any, params?: Record<string, any>): Observable<T> {
    const fullUrl = this.buildUrl(endpoint, params);
    return this.http.put<T>(fullUrl, body);
  }

  /**
   * DELETE request genérico que agrega automáticamente org_slug
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
   * Getter para el slug de la organización actual
   */
  get currentOrgSlug(): string {
    return this.orgSlug;
  }
}
