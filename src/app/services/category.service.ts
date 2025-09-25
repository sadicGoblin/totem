import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { Category, CategoryApiResponse } from '../models/category.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {

  constructor(private baseApi: BaseApiService) {}

  /**
   * Obtiene todas las categorías desde la API
   * Automáticamente agrega org_slug a la request
   */
  getCategories(): Observable<CategoryApiResponse> {
    return this.baseApi.get<CategoryApiResponse>('category');
  }

  /**
   * Obtiene una categoría específica por ID
   * Automáticamente agrega org_slug a la request
   */
  getCategoryById(id: number): Observable<Category> {
    return this.baseApi.get<Category>(`category/${id}`);
  }

  /**
   * Obtiene una categoría específica por slug
   * Automáticamente agrega org_slug a la request
   */
  getCategoryBySlug(slug: string): Observable<Category> {
    return this.baseApi.get<Category>(`category/${slug}`);
  }

  /**
   * Obtiene categorías filtradas por parámetros adicionales
   */
  getCategoriesFiltered(params: Record<string, any>): Observable<CategoryApiResponse> {
    return this.baseApi.get<CategoryApiResponse>('category', params);
  }
}
