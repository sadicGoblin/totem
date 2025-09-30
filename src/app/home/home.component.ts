import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product as ApiProduct } from '../models/product.model';
import { CartItem, Product } from '../models/products.model';
import { ProductService } from '../services/product.service';
import { CartService } from '../services/cart.service';
import { CategoryService } from '../services/category.service';
import { ModalComponent } from '../components/modal/modal.component';
import { CartFloatingComponent } from '../shared/cart-floating/cart-floating.component';
import { ActivatedRoute, Router } from '@angular/router';
import { Category } from '../models/category.model';

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
  selectedSubcategory: string | null = null;
  hideNavButtons: boolean = false; // Para ocultar los botones de navegación

  // Subscripciones
  private subscriptions: any[] = [];

  // Modal properties
  selectedProduct: any = null;
  showModal: boolean = false;

  // Categorías dinámicas desde API
  categories: Category[] = [];
  currentCategory: Category | null = null;

  // Subcategorías por categoría principal (mantenemos para compatibilidad)
  subcategories: { [key: string]: string[] } = {
    'TELEFONIA': ['PLANES', 'EQUIPOS'],
    'HOGAR': ['INTERNET', 'PACKS', 'EQUIPOS'],
    'ACCESORIOS': ['PROTECCION', 'CARGA', 'AUDIO']
  };

  products: Product[] = [];
  isLoadingProducts: boolean = false;

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private categoryService: CategoryService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.checkOrientation();
  }

  ngOnInit(): void {
    // Primero cargar las categorías disponibles
    this.categoryService.getCategoriesResults().subscribe({
      next: (categories) => {
        this.categories = categories;
        console.log('Categorías cargadas:', categories);

        // Después verificar parámetros de URL
        this.route.queryParams.subscribe((params) => {
          if (params['category']) {
            const categorySlug = params['category'].toLowerCase();
            console.log('Buscando categoría con slug:', categorySlug);

            // Buscar la categoría usando el método del servicio
            this.currentCategory = this.categoryService.findCategoryBySlugOrName(categorySlug) || null;

            if (this.currentCategory) {
              console.log('Categoría encontrada:', this.currentCategory);
              this.selectedCategory = this.currentCategory.name;
              this.loadProductsByCategory(this.currentCategory.id);
            } else {
              console.warn('Categoría no encontrada:', categorySlug);
              console.log('Categorías disponibles:', this.categories.map(c => ({ slug: c.slug, name: c.name })));
            }

            // Ocultar botones si venimos desde selección de categoría
            this.hideNavButtons = true;
          } else {
            // Si no hay categoría específica, cargar todos los productos
            this.loadAllProducts();
          }
        });
      },
      error: (error) => {
        console.error('Error cargando categorías:', error);
        // Fallback: cargar todos los productos
        this.loadAllProducts();
      }
    });
  }

  /**
   * Carga productos por categoría específica
   */
  private loadProductsByCategory(categoryId: number): void {
    this.isLoadingProducts = true;
    this.products = [];

    console.log('Cargando productos para categoría ID:', categoryId);

    this.productService.getProductsByCategory(categoryId).subscribe({
      next: (products) => {
        this.products = products as Product[];
        this.isLoadingProducts = false;
        console.log('Productos cargados:', products);
      },
      error: (error) => {
        console.error('Error cargando productos por categoría:', error);
        this.isLoadingProducts = false;
      }
    });
  }

  /**
   * Carga todos los productos (fallback)
   */
  private loadAllProducts(): void {
    this.isLoadingProducts = true;
    this.productService.getProducts().subscribe({
      next: (response) => {
        this.products = response.results.map(product => ({
          id: product.id,
          sku: product.sku,
          name: product.name,
          price: product.price,
          category: String(product.category),
          image: product.image,
          description: product.description,
          discount: product.discount || 0,
          specialTag: product.specialTag || '',
          originalPrice: product.originalPrice || product.price,
          quantity: product.quantity || 1
        })) as Product[];
        this.isLoadingProducts = false;
        console.log('Todos los productos cargados:', this.products);
      },
      error: (error) => {
        console.error('Error cargando todos los productos:', error);
        this.isLoadingProducts = false;
      }
    });
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
    if (this.selectedCategory === null) {
      return this.products;
    }

    let filtered = this.products.filter(
      (p) => String(p.category).toUpperCase() === this.selectedCategory?.toUpperCase()
    );

    // Si hay subcategoría seleccionada, filtrar también por subcategoría
    if (this.selectedSubcategory && this.shouldShowSubcategories()) {
      filtered = filtered.filter(
        (p: any) => p.subcategory?.toUpperCase() === this.selectedSubcategory?.toUpperCase()
      );
    }

    return filtered;
  }

  formatPrice(price: number): string {
    return '$' + price.toLocaleString('es-CL');
  }

  addToCart(product: Product): void {
    const adaptedProduct = this.adaptProductForModal(product);
    this.cartService.addToCart(adaptedProduct);
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

  /**
   * Convierte un producto al formato esperado por el modal
   */
  private adaptProductForModal(product: Product): any {
    return {
      id: product.id,
      sku: product.sku || '',
      name: product.name,
      price: product.price,
      category: String(product.category),
      image: product.image || '',
      description: product.description || '',
      discount: product.discount,
      specialTag: product.specialTag,
      originalPrice: product.originalPrice,
      quantity: product.quantity
    };
  }

  openProductModal(product: Product): void {
    this.selectedProduct = this.adaptProductForModal(product);
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedProduct = null;
  }

  // Método para manejar la adición de productos desde el modal con cantidades específicas
  handleAddToCartFromModal(data: { product: any; quantity: number }): void {
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
