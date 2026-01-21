import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../services/cart.service';
import { CatalogueService, Product as CatalogueProduct } from '../services/catalogue.service';
import { Product } from '../models/products.model';
import { ModalComponent } from '../components/modal/modal.component';
import { CartFloatingComponent } from '../shared/cart-floating/cart-floating.component';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

// Interface extendida para agregar categoryId
interface ProductWithCategory extends Product {
  categoryId?: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ModalComponent, CartFloatingComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  host: {
    '[class.landscape-mode]': 'isLandscapeMode',
  },
})
export class HomeComponent implements OnInit, OnDestroy {
  isLandscapeMode: boolean = false;
  selectedCategory: string | null = null;
  selectedCategoryId: number | null = null;
  hideNavButtons: boolean = false;

  // Logo de la tienda desde client_configuration
  get storeLogo(): string {
    const config = this.catalogueService.getClientConfiguration();
    return config?.logo || config?.logo_url || '';
  }

  // Subscripciones
  private subscriptions: Subscription[] = [];

  // Modal properties
  selectedProduct: ProductWithCategory | null = null;
  showModal: boolean = false;

  products: ProductWithCategory[] = [];

  constructor(
    private catalogueService: CatalogueService,
    private cartService: CartService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.checkOrientation();
  }

  ngOnInit(): void {
    // Scroll al inicio de la página
    window.scrollTo(0, 0);
    
    // Cargar productos desde el caché local
    this.loadProducts();

    // Suscribirse a los parámetros de la URL
    const paramsSub = this.route.queryParams.subscribe((params) => {
      if (params['categoryId']) {
        this.selectedCategoryId = parseInt(params['categoryId'], 10);
        this.selectedCategory = params['categoryName'] || 'Categoría';
        this.hideNavButtons = true;
      } else {
        this.selectedCategoryId = null;
        this.selectedCategory = null;
      }
    });
    this.subscriptions.push(paramsSub);

    // Suscribirse a cambios del catálogo para actualizar productos
    const catalogueSub = this.catalogueService.catalogue$.subscribe((catalogue) => {
      if (catalogue) {
        this.loadProducts();
      }
    });
    this.subscriptions.push(catalogueSub);
  }

  /**
   * Carga productos desde el CatalogueService y los adapta al formato del componente
   */
  private loadProducts(): void {
    const catalogueProducts = this.catalogueService.getProducts();
    this.products = catalogueProducts
      .filter(p => p.state === 'publish' && !p.is_removed)
      .map(p => this.mapCatalogueProduct(p));
  }

  /**
   * Mapea un producto del catálogo al formato del componente
   */
  private mapCatalogueProduct(p: CatalogueProduct): ProductWithCategory {
    const price = p.price_1 ? parseFloat(p.price_1) : 0;
    const originalPrice = p.price_2 ? parseFloat(p.price_2) : undefined;
    
    // Calcular porcentaje de descuento si hay precio original mayor al precio actual
    let discountPercent: number | undefined;
    if (originalPrice && originalPrice > price) {
      discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
    }
    
    return {
      id: p.id,
      name: p.name,
      description: p.short_description || p.description || '',
      price: price,
      originalPrice: discountPercent ? originalPrice : undefined,
      image: p.images && p.images.length > 0 ? p.images[0].image : this.getPlaceholderImage(p.name),
      category: p.categories && p.categories.length > 0 ? p.categories[0].name : '',
      categoryId: p.categories && p.categories.length > 0 ? p.categories[0].id : undefined,
      discount: discountPercent
    };
  }

  /**
   * Genera un placeholder SVG inline para productos sin imagen
   */
  private getPlaceholderImage(productName: string): string {
    const text = productName.substring(0, 12);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
        <rect width="300" height="300" fill="#f5f5f5"/>
        <text x="150" y="150" font-family="Arial, sans-serif" font-size="16" fill="#999" text-anchor="middle" dominant-baseline="middle">${text}</text>
      </svg>
    `;
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg.trim());
  }

  @HostListener('window:resize')
  checkOrientation(): void {
    this.isLandscapeMode = window.innerWidth > window.innerHeight;
  }

  /**
   * Filtra productos por categoría seleccionada (usando categoryId)
   */
  getFilteredProducts(): ProductWithCategory[] {
    if (this.selectedCategoryId === null) {
      return this.products;
    }

    return this.products.filter(p => p.categoryId === this.selectedCategoryId);
  }

  formatPrice(price: number): string {
    return '$' + price.toLocaleString('es-CL');
  }

  addToCart(product: ProductWithCategory): void {
    this.cartService.addToCart(product);
  }

  decreaseQuantity(product: ProductWithCategory): void {
    this.cartService.decreaseQuantity(product.id);
  }

  // Obtener la cantidad de un producto en el carrito (para el modal)
  getItemQuantityInCart(productId: number): number {
    return this.cartService.getItemQuantity(productId);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  openProductModal(product: ProductWithCategory): void {
    this.selectedProduct = product;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedProduct = null;
  }

  // Método para manejar la adición de productos desde el modal con cantidades específicas
  handleAddToCartFromModal(data: { product: Product; quantity: number }): void {
    const { product, quantity } = data;

    // Si la cantidad es positiva, añadir al carrito
    if (quantity > 0) {
      this.cartService.addToCart(product);
    }
    // Si la cantidad es negativa, decrementar del carrito
    else if (quantity < 0) {
      this.cartService.decreaseQuantity(product.id);
    }
  }

  // Método para navegar a la página de checkout
  goToCheckout(): void {
    // Navegamos directamente a la página de checkout
    this.router.navigate(['/checkout']);
  }

  // Método para volver a la página de categorías
  goBackToCategories(): void {
    // Navegamos a la página de categorías
    this.router.navigate(['/category']);
  }
}
