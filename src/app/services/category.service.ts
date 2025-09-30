import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { CategoryApiResponse, Category } from '../models/category.model';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private apiUrl = `${environment.apiUrl}/api/category/`;
  
  // Cache de categorías para evitar múltiples llamadas a la API
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  public categories$ = this.categoriesSubject.asObservable();
  
  // Getter para acceso directo a las categorías actuales
  public get categories(): Category[] {
    return this.categoriesSubject.value;
  }

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) { }

  /**
   * Obtiene todas las categorías desde la API
   * @returns Observable con la respuesta de la API que contiene las categorías
   */
  getCategories(): Observable<CategoryApiResponse> {
    return this.http.get<CategoryApiResponse>(this.apiUrl);
  }

  /**
   * Extrae solo las categorías del response de la API filtradas por organización activa
   * @returns Observable con array de categorías filtradas
   */
  getCategoriesResults(): Observable<Category[]> {
    // Si ya tenemos categorías cacheadas, devolverlas
    if (this.categories.length > 0) {
      return this.categories$;
    }

    return this.getCategories().pipe(
      map((response: CategoryApiResponse) => {
        const organizationId = this.configService.getOrganizationId();
        
        // Si no hay configuración cargada, devolver todas las categorías
        if (!organizationId) {
          console.warn('No hay configuración de cliente cargada, mostrando todas las categorías');
          return response.results;
        }
        
        // Filtrar categorías por organización del cliente activo
        return response.results.filter(category => 
          category.organization === organizationId
        );
      }),
      tap(categories => {
        // Guardar categorías en el cache
        this.categoriesSubject.next(categories);
        console.log('Categorías guardadas en cache:', categories);
      })
    );
  }

  /**
   * Obtiene una categoría específica por ID
   * @param id ID de la categoría
   * @returns Observable con la categoría
   */
  getCategoryById(id: number): Observable<Category | undefined> {
    return this.getCategoriesResults().pipe(
      map(categories => categories.find(category => category.id === id))
    );
  }

  /**
   * Obtiene una categoría específica por slug
   * @param slug Slug de la categoría
   * @returns Observable con la categoría
   */
  getCategoryBySlug(slug: string): Observable<Category | undefined> {
    return this.getCategoriesResults().pipe(
      map(categories => categories.find(category => category.slug === slug))
    );
  }

  /**
   * Busca una categoría por slug o nombre (síncrono, usa cache)
   * @param searchTerm Slug o nombre de la categoría
   * @returns Categoría encontrada o undefined
   */
  findCategoryBySlugOrName(searchTerm: string): Category | undefined {
    const categories = this.categories;
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return categories.find(category => 
      category.slug.toLowerCase() === lowerSearchTerm || 
      category.name.toLowerCase() === lowerSearchTerm
    );
  }

  /**
   * Fuerza la recarga de categorías desde la API
   * @returns Observable con las categorías actualizadas
   */
  reloadCategories(): Observable<Category[]> {
    this.categoriesSubject.next([]); // Limpiar cache
    return this.getCategoriesResults();
  }
}
