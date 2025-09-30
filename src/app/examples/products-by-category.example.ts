import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../services/product.service';
import { CategoryService } from '../services/category.service';
import { ConfigService } from '../services/config.service';
import { Product } from '../models/product.model';
import { Category } from '../models/category.model';
import { getActiveClientSlug } from '../config/client.config';

/**
 * EJEMPLO: Componente que muestra cómo usar el nuevo sistema de configuración de cliente
 * para obtener categorías y productos filtrados por organización
 */
@Component({
  selector: 'app-products-by-category-example',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="client-info" *ngIf="clientConfig">
      <h2>Cliente Activo: {{ clientConfig.name }}</h2>
      <p>Organización ID: {{ clientConfig.organization_id }}</p>
      <p>Colores: {{ clientConfig.primary_color }} / {{ clientConfig.secondary_color }}</p>
      <p>Slug: {{ activeClientSlug }}</p>
    </div>

    <div class="categories-section">
      <h3>Categorías Disponibles</h3>
      <div class="categories-grid">
        <div 
          *ngFor="let category of categories" 
          class="category-card"
          (click)="selectCategory(category)"
          [class.selected]="selectedCategory?.id === category.id">
          <img [src]="category.image" [alt]="category.name" />
          <h4>{{ category.name }}</h4>
          <p [innerHTML]="category.description"></p>
        </div>
      </div>
    </div>

    <div class="products-section" *ngIf="selectedCategory">
      <h3>Productos de {{ selectedCategory.name }}</h3>
      <div class="loading" *ngIf="loadingProducts">Cargando productos...</div>
      <div class="products-grid" *ngIf="!loadingProducts">
        <div *ngFor="let product of products" class="product-card">
          <img [src]="product.image" [alt]="product.name" />
          <h4>{{ product.name }}</h4>
          <p>{{ product.description }}</p>
          <p class="price">\${{ product.price | number:'1.0-0' }}</p>
          <p class="sku" *ngIf="product.sku">SKU: {{ product.sku }}</p>
        </div>
      </div>
      <div *ngIf="!loadingProducts && products.length === 0" class="no-products">
        No hay productos disponibles para esta categoría
      </div>
    </div>
  `,
  styles: [`
    .client-info {
      background: #f5f5f5;
      padding: 1rem;
      margin-bottom: 2rem;
      border-radius: 8px;
    }

    .categories-grid, .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .category-card, .product-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .category-card:hover, .product-card:hover {
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }

    .category-card.selected {
      border-color: #007bff;
      background-color: #f0f8ff;
    }

    .category-card img, .product-card img {
      width: 100%;
      height: 150px;
      object-fit: cover;
      border-radius: 4px;
      margin-bottom: 0.5rem;
    }

    .price {
      font-weight: bold;
      color: #28a745;
      font-size: 1.2em;
    }

    .sku {
      font-size: 0.8em;
      color: #666;
    }

    .loading, .no-products {
      text-align: center;
      padding: 2rem;
      color: #666;
    }
  `]
})
export class ProductsByCategoryExampleComponent implements OnInit {
  activeClientSlug = getActiveClientSlug();
  clientConfig: any = null;
  categories: Category[] = [];
  products: Product[] = [];
  selectedCategory: Category | null = null;
  loadingProducts = false;

  constructor(
    private categoryService: CategoryService,
    private productService: ProductService,
    private configService: ConfigService
  ) {}

  ngOnInit() {
    // Suscribirse a la configuración del cliente
    this.configService.config$.subscribe(config => {
      this.clientConfig = config;
    });
    
    this.loadCategories();
  }

  loadCategories() {
    this.categoryService.getCategoriesResults().subscribe({
      next: (categories) => {
        this.categories = categories;
        console.log('Categorías cargadas para cliente', this.clientConfig?.name || this.activeClientSlug, ':', categories);
      },
      error: (error) => {
        console.error('Error cargando categorías:', error);
      }
    });
  }

  selectCategory(category: Category) {
    this.selectedCategory = category;
    this.loadProductsByCategory(category.id);
  }

  loadProductsByCategory(categoryId: number) {
    this.loadingProducts = true;
    this.products = [];

    this.productService.getProductsByCategory(categoryId).subscribe({
      next: (products) => {
        this.products = products as any;
        this.loadingProducts = false;
        console.log('Productos cargados para categoría', categoryId, ':', products);
      },
      error: (error) => {
        console.error('Error cargando productos:', error);
        this.loadingProducts = false;
      }
    });
  }
}

/*
INSTRUCCIONES DE USO:

1. Para cambiar de cliente, edita src/app/config/client.config.ts:
   - Cambia ACTIVE_CLIENT = 'entel' o ACTIVE_CLIENT = 'liquidos'

2. Para usar este componente en tu aplicación:
   - Importa ProductsByCategoryExampleComponent
   - Agrégalo a tu routing o úsalo en otro componente

3. API Endpoints que se usan automáticamente:
   - GET /api/category/ (filtrado por organization)
   - GET /api/product_view/?categories={category_id} (filtrado por organization)

4. Ejemplo de datos que se obtienen:
   - Entel (organizationId: 1): TELEFONÍA, HOGAR, ACCESORIOS
   - Líquidos (organizationId: 2): Vinos, Cervezas, Espumantes, Piscos, Bebidas
*/
