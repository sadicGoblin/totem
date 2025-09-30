import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product, CartItem } from '../models/products.model';
import { ProductService } from '../services/product.service';
import { CartService } from '../services/cart.service';
import { ModalComponent } from '../components/modal/modal.component';
import { CartFloatingComponent } from '../shared/cart-floating/cart-floating.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfigService, ClientConfig } from '../services/config.service';
import { CategoryService } from '../services/category.service';
import { getActiveClientSlug } from '../config/client.config';

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
  selectedCategory: string | null = 'TELEFONIA';
  selectedSubcategory: string | null = 'PLANES'; // Por defecto PLANES para TELEFONIA
  hideNavButtons: boolean = false; // Para ocultar los botones de navegación
  
  // Configuración del cliente
  clientConfig: ClientConfig | null = null;

  // Subscripciones
  private subscriptions: any[] = [];

  // Modal properties
  selectedProduct: Product | null = null;
  showModal: boolean = false;

  categories = [
    'TELEFONIA',
    'HOGAR',
    'ACCESORIOS',
  ];

  // Subcategorías por categoría principal
  subcategories: { [key: string]: string[] } = {
    'TELEFONIA': ['PLANES', 'EQUIPOS'],
    'HOGAR': ['INTERNET', 'PACKS', 'EQUIPOS'],
    'ACCESORIOS': ['PROTECCION', 'CARGA', 'AUDIO']
  };

  products: Product[] = [];

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private router: Router,
    private route: ActivatedRoute,
    private configService: ConfigService,
    private categoryService: CategoryService
  ) {
    this.checkOrientation();
  }

  ngOnInit(): void {
    // Cargar configuración del cliente
    const clientSlug = getActiveClientSlug();
    this.configService.loadConfig(clientSlug).subscribe({
      next: (config) => {
        this.clientConfig = config;
      },
      error: (error) => {
        console.error('Error cargando configuración del cliente:', error);
      }
    });

    // Verificar si hay un parámetro de categoría en la URL
    this.route.queryParams.subscribe((params) => {
      if (params['category']) {
        const categorySlug = params['category'].toLowerCase();
        
        // Buscar la categoría por slug y cargar productos filtrados
        this.categoryService.getCategoryBySlug(categorySlug).subscribe((category) => {
          if (category) {
            this.selectedCategory = category.name.toUpperCase();
            // Cargar productos filtrados por categoría
            this.productService.getProductsByCategory(category.id).subscribe((products) => {
              this.products = products;
              console.log(`Productos cargados para categoría ${category.name}:`, products);
            });
          }
        });
        
        // Ocultar botones si venimos desde selección de categoría
        this.hideNavButtons = true;
      } else {
        // Si no hay categoría seleccionada, cargar todos los productos
        this.productService.getProducts().subscribe((products) => {
          this.products = products;
        });
      }
    });

    // Ya no necesitamos suscribirnos al carrito, lo maneja CartFloatingComponent
  }

  @HostListener('window:resize')
  checkOrientation(): void {
    this.isLandscapeMode = window.innerWidth > window.innerHeight;
  }

  setCategory(category: string | null): void {
    this.selectedCategory = category;
    if (category) {
      this.setDefaultSubcategory(category);
    }
  }

  setDefaultSubcategory(category: string): void {
    if (category === 'TELEFONIA') {
      this.selectedSubcategory = 'PLANES';
    } else {
      this.selectedSubcategory = null;
    }
  }

  setSubcategory(subcategory: string): void {
    this.selectedSubcategory = subcategory;
  }

  getAvailableSubcategories(): string[] {
    if (!this.selectedCategory) return [];
    return this.subcategories[this.selectedCategory] || [];
  }

  shouldShowSubcategories(): boolean {
    return this.selectedCategory === 'TELEFONIA';
  }

  // getFilteredProducts(): Product[] {
  //   return this.selectedCategory === null
  //     ? this.products
  //     : this.products.filter(p => p.category === this.selectedCategory);
  // }

  getFilteredProducts(): Product[] {
    // Los productos ya vienen filtrados del backend
    // Solo necesitamos filtrar por subcategoría si aplica
    if (this.selectedSubcategory && this.shouldShowSubcategories()) {
      return this.products.filter(
        (p: any) => p.subcategory?.toUpperCase() === this.selectedSubcategory?.toUpperCase()
      );
    }
    
    return this.products;
  }

  formatPrice(price: number | string | undefined): string {
    if (price === undefined || price === null) {
      return '$0';
    }
    // Convertir a número si viene como string
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    // Formatear con separador de miles (punto) y sin decimales
    return '$' + Math.round(numPrice).toLocaleString('es-CL');
  }

  addToCart(product: Product): void {
    this.cartService.addToCart(product);
  }

  decreaseQuantity(product: Product): void {
    this.cartService.decreaseQuantity(product.id);
  }

  // Obtener la cantidad de un producto en el carrito (para el modal)
  getItemQuantityInCart(productId: number): number {
    return this.cartService.getItemQuantity(productId);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  openProductModal(product: Product): void {
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
