import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Product as ApiProduct, ProductApiResponse } from '../models/product.model';
import { Product } from '../models/products.model';
import { environment } from '../../environments/environment';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/api/product_view/`;

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {}

  /**
   * Convierte un producto de la API al formato esperado por la aplicación
   */
  private adaptApiProduct(apiProduct: ApiProduct): Product {
    // Extraer el nombre de la primera categoría si existe
    let categoryName = 'Sin categoría';
    if (apiProduct.categories && apiProduct.categories.length > 0) {
      categoryName = apiProduct.categories[0].name;
    }

    return {
      id: apiProduct.id,
      sku: apiProduct.sku,
      name: apiProduct.name,
      price: apiProduct.price_1 || apiProduct.price || 0,
      category: categoryName,
      image: apiProduct.image || (apiProduct.images && apiProduct.images.length > 0 ? apiProduct.images[0].image : ''),
      description: apiProduct.description,
      discount: apiProduct.discount,
      specialTag: apiProduct.specialTag,
      originalPrice: apiProduct.originalPrice,
      quantity: apiProduct.quantity
    };
  }

  /**
   * Obtiene todos los productos desde la API
   * @returns Observable con la respuesta de la API que contiene los productos
   */
  getProducts(): Observable<ProductApiResponse> {
    return this.http.get<ProductApiResponse>(this.apiUrl);
  }

  /**
   * Obtiene productos filtrados por categoría
   * @param categoryId ID de la categoría
   * @returns Observable con array de productos filtrados
   */
  getProductsByCategory(categoryId: number): Observable<Product[]> {
    const params = new HttpParams().set('categories', categoryId.toString());
    
    return this.http.get<ProductApiResponse>(this.apiUrl, { params }).pipe(
      map((response: ProductApiResponse) => {
        const organizationId = this.configService.getOrganizationId();
        
        let filteredProducts = response.results;
        
        // Filtrar por organización si hay configuración cargada
        if (organizationId) {
          filteredProducts = filteredProducts.filter(product => 
            product.organization === organizationId
          );
        } else {
          console.warn('No hay configuración de cliente cargada, mostrando todos los productos');
        }
        
        // Convertir productos de API al formato esperado
        return filteredProducts.map(product => this.adaptApiProduct(product));
      })
    );
  }

  /**
   * Obtiene un producto específico por ID
   * @param id ID del producto
   * @returns Observable con el producto
   */
  getProductById(id: number): Observable<Product | undefined> {
    return this.getProducts().pipe(
      map((response: ProductApiResponse) => {
        const product = response.results.find(product => product.id === id);
        return product ? this.adaptApiProduct(product) : undefined;
      })
    );
  }

  /**
   * Obtiene un producto específico por SKU
   * @param sku SKU del producto
   * @returns Observable con el producto
   */
  getProductBySku(sku: string): Observable<Product | undefined> {
    return this.getProducts().pipe(
      map((response: ProductApiResponse) => {
        const product = response.results.find(product => product.sku === sku);
        return product ? this.adaptApiProduct(product) : undefined;
      })
    );
  }

  /**
   * Busca productos por nombre o descripción
   * @param searchTerm Término de búsqueda
   * @returns Observable con array de productos que coinciden
   */
  searchProducts(searchTerm: string): Observable<Product[]> {
    return this.getProducts().pipe(
      map((response: ProductApiResponse) => {
        const organizationId = this.configService.getOrganizationId();
        
        let filteredProducts = response.results;
        
        // Filtrar por organización si hay configuración cargada
        if (organizationId) {
          filteredProducts = filteredProducts.filter(product => 
            product.organization === organizationId
          );
        }
        
        // Filtrar por término de búsqueda y convertir al formato esperado
        return filteredProducts
          .filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.description.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map(product => this.adaptApiProduct(product));
      })
    );
  }
}
