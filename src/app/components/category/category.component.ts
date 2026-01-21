import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { CatalogueService, Category } from '../../services/catalogue.service';
import { CartFloatingComponent } from '../../shared/cart-floating/cart-floating.component';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule, CartFloatingComponent],
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.scss']
})
export class CategoryComponent implements OnInit {
  categories: Category[] = [];
  loading = false;
  error = false;
  
  constructor(
    private router: Router,
    private cartService: CartService,
    private catalogueService: CatalogueService
  ) {}

  ngOnInit(): void {
    // Scroll al inicio de la página
    window.scrollTo(0, 0);
    
    this.loadCategories();
  }

  /**
   * Carga las categorías desde el caché local (CatalogueService)
   */
  loadCategories(): void {
    this.loading = true;
    this.error = false;
    
    // Obtener categorías del caché local
    const categories = this.catalogueService.getCategories();
    
    if (categories && categories.length > 0) {
      // Filtrar solo categorías publicadas y ordenar por order
      this.categories = categories
        .filter(cat => cat.state === 'publish')
        .sort((a, b) => a.order - b.order);
      this.loading = false;
    } else {
      // Si no hay datos, suscribirse a cambios del catálogo
      this.catalogueService.catalogue$.subscribe({
        next: (catalogue) => {
          if (catalogue) {
            this.categories = catalogue.categories
              .filter(cat => cat.state === 'publish')
              .sort((a, b) => a.order - b.order);
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading categories:', error);
          this.error = true;
          this.loading = false;
        }
      });
    }
  }

  /**
   * Maneja la selección de una categoría y navega a la página correspondiente
   * @param category Categoría seleccionada
   */
  selectCategory(category: Category): void {
    // Pasar el ID de la categoría para filtrar productos localmente
    this.router.navigate(['/home'], { 
      queryParams: { 
        categoryId: category.id,
        categoryName: category.name 
      } 
    });
  }

  /**
   * Maneja errores de carga de imagen con fallback
   * @param event Evento de error de imagen
   * @param category Categoría para generar placeholder
   */
  onImageError(event: any, category: Category): void {
    // Usar un SVG inline como placeholder cuando la imagen falla
    // Obtener colores del branding actual
    const branding = this.catalogueService.getBranding();
    const bgColor = branding.primaryColor || '#1a1a1a';
    const textColor = branding.secondaryColor || '#ffffff';
    
    const text = category.name.toUpperCase().substring(0, 15);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
        <rect width="400" height="300" fill="${bgColor}"/>
        <text x="200" y="150" font-family="Arial, sans-serif" font-size="24" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${text}</text>
      </svg>
    `;
    event.target.src = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg.trim());
  }

  /**
   * Función trackBy para optimizar el rendering del ngFor
   * @param index Índice del elemento
   * @param category Categoría
   */
  trackByCategory(index: number, category: Category): number {
    return category.id;
  }

  /**
   * Obtiene el logo de la tienda desde client_configuration
   */
  get storeLogo(): string {
    return this.catalogueService.getClientConfiguration()?.logo_url || 
           this.catalogueService.getClientConfiguration()?.logo || 
           '';
  }
}
