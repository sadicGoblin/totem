import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Product } from '../models/products.model';
import { environment } from '../../environments/environment';

interface ProductApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/api/product_view/`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los productos desde la API
   * @returns Observable con array de productos
   */
  getProducts(): Observable<Product[]> {
    return this.http.get<ProductApiResponse>(this.apiUrl).pipe(
      map(response => response.results)
    );
  }

  /**
   * Obtiene productos filtrados por categoría
   * @param categoryId ID de la categoría
   * @returns Observable con array de productos de esa categoría
   */
  getProductsByCategory(categoryId: number): Observable<Product[]> {
    // Usar el endpoint /api/product_view/ con el filtro categories
    const url = `${this.apiUrl}?categories=${categoryId}`;
    return this.http.get<ProductApiResponse>(url).pipe(
      map(response => response.results)
    );
  }

  /**
   * Obtiene productos filtrados por slug de categoría
   * @param categoryName Nombre de la categoría
   * @returns Observable con array de productos de esa categoría
   */
  getProductsByCategoryName(categoryName: string): Observable<Product[]> {
    const url = `${environment.apiUrl}/api/product/?categories__name=${categoryName}`;
    return this.http.get<ProductApiResponse>(url).pipe(
      map(response => response.results)
    );
  }
}
