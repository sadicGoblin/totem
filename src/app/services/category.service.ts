import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CategoryApiResponse, Category } from '../models/category.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private apiUrl = `${environment.apiUrl}/api/category/`;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene todas las categorías desde la API
   * @returns Observable con la respuesta de la API que contiene las categorías
   */
  getCategories(): Observable<CategoryApiResponse> {
    return this.http.get<CategoryApiResponse>(this.apiUrl);
  }

  /**
   * Extrae solo las categorías del response de la API
   * @returns Observable con array de categorías
   */
  getCategoriesResults(): Observable<Category[]> {
    return new Observable<Category[]>(observer => {
      this.getCategories().subscribe({
        next: (response: CategoryApiResponse) => {
          observer.next(response.results);
          observer.complete();
        },
        error: (error) => {
          console.error('Error fetching categories:', error);
          observer.error(error);
        }
      });
    });
  }
}
