import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../services/cart.service';
import { CatalogueService, Product as CatalogueProduct, Category, Slide } from '../services/catalogue.service';
import { Product } from '../models/products.model';
import { ModalComponent } from '../components/modal/modal.component';
import { CartFloatingComponent } from '../shared/cart-floating/cart-floating.component';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { ThemeService } from '../services/theme.service';
import { HomeTheme } from '../models/theme.model';

// Interface extendida para agregar categoryId y tags
interface ProductWithCategory extends Product {
  categoryId?: number;
  tags?: string;
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
  private readonly REFRESH_AFTER_PURCHASE_FLAG = 'totem_refresh_after_purchase';
  isLandscapeMode: boolean = false;
  isCatalogueLoading = false;
  selectedCategory: string | null = null;
  selectedCategoryId: number | null = null;
  hideNavButtons: boolean = false;

  // Categories and Slides
  categories: Category[] = [];
  slides: Slide[] = [];
  currentSlideIndex: number = 0;
  private slideInterval: Subscription | null = null;

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
    private route: ActivatedRoute,
    public themeService: ThemeService
  ) {
    this.checkOrientation();
  }

  // Getter para acceder al tema del home
  get homeTheme(): HomeTheme {
    return this.themeService.getHome();
  }

  ngOnInit(): void {
    // Scroll al inicio de la página
    window.scrollTo(0, 0);

    // Cargar datos desde el catálogo
    this.loadProducts();
    this.loadCategories();
    this.loadSlides();

    // Suscribirse a los parámetros de la URL
    const paramsSub = this.route.queryParams.subscribe((params) => {
      if (params['categoryId']) {
        this.selectedCategoryId = parseInt(params['categoryId'], 10);
        this.selectedCategory = params['categoryName'] || 'Categoría';
      } else if (params['tag']) {
        // Filtrar por tag desde slide
        this.filterByTag(params['tag']);
      }
    });
    this.subscriptions.push(paramsSub);

    const loadingSub = this.catalogueService.loading$.subscribe((isLoading) => {
      this.isCatalogueLoading = isLoading;
    });
    this.subscriptions.push(loadingSub);

    // Suscribirse a cambios del catálogo para actualizar datos
    const catalogueSub = this.catalogueService.catalogue$.subscribe((catalogue) => {
      if (catalogue) {
        this.loadProducts();
        this.loadCategories();
        this.loadSlides();
      }
    });
    this.subscriptions.push(catalogueSub);

    // Si hay una compra reciente, forzar refresh al llegar a Home
    if (localStorage.getItem(this.REFRESH_AFTER_PURCHASE_FLAG) === '1') {
      this.catalogueService.refreshCatalogue()
        .then(() => {
          localStorage.removeItem(this.REFRESH_AFTER_PURCHASE_FLAG);
        })
        .catch(() => {
          // Mantener flag para reintentar en próximo ingreso a Home
        });
    }

    // Auto-slide cada 5 segundos
    this.startSlideAutoPlay();
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
   * Carga categorías desde el CatalogueService
   */
  private loadCategories(): void {
    this.categories = this.catalogueService.getCategories()
      .filter(c => c.state === 'publish');
  }

  /**
   * Carga slides desde el CatalogueService
   */
  private loadSlides(): void {
    this.slides = this.catalogueService.getSlides()
      .filter(s => s.state === 'publish')
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Inicia el auto-play del slider
   */
  private startSlideAutoPlay(): void {
    if (this.slides.length > 1) {
      this.slideInterval = interval(5000).subscribe(() => {
        this.nextSlide();
      });
    }
  }

  /**
   * Avanza al siguiente slide
   */
  private nextSlide(): void {
    this.currentSlideIndex = (this.currentSlideIndex + 1) % this.slides.length;
  }

  /**
   * Va a un slide específico
   */
  goToSlide(index: number): void {
    this.currentSlideIndex = index;
  }

  /**
   * Maneja el click en un slide
   */
  onSlideClick(slide: Slide): void {
    if (slide.link) {
      // Si tiene link, puede ser una categoría o un tag
      if (slide.link.startsWith('category:')) {
        const categoryId = parseInt(slide.link.replace('category:', ''), 10);
        this.selectCategory(categoryId);
      } else if (slide.link.startsWith('tag:')) {
        const tag = slide.link.replace('tag:', '');
        this.filterByTag(tag);
      } else {
        // Link externo o ruta
        this.router.navigateByUrl(slide.link);
      }
    } else if (slide.tags) {
      // Si tiene tags, filtrar por el primer tag
      const tag = slide.tags.split(',')[0].trim();
      this.filterByTag(tag);
    }
  }

  /**
   * Selecciona una categoría
   */
  selectCategory(categoryId: number | null): void {
    this.selectedCategoryId = categoryId;
    this.currentTagFilter = null; // Limpiar filtro de tag
    if (categoryId === null) {
      this.selectedCategory = null;
    } else {
      const category = this.categories.find(c => c.id === categoryId);
      this.selectedCategory = category?.name || null;
    }
    
    // Scroll al inicio del área de productos
    const productsMain = document.querySelector('.products-main');
    if (productsMain) {
      productsMain.scrollTop = 0;
    }
  }

  /**
   * Filtra productos por tag
   */
  private filterByTag(tag: string): void {
    this.selectedCategory = `#${tag}`;
    this.selectedCategoryId = null;
    this.currentTagFilter = tag;
  }

  private currentTagFilter: string | null = null;

  /**
   * Mapea un producto del catálogo al formato del componente
   */
  private mapCatalogueProduct(p: CatalogueProduct): ProductWithCategory {
    const regularPrice = p.price_1 ? parseFloat(p.price_1) : 0;
    const offerPrice = p.price_2 ? parseFloat(p.price_2) : undefined;

    // Si existe price_2, se considera precio vigente de oferta.
    const hasOffer = typeof offerPrice === 'number' && offerPrice > 0;
    const currentPrice = hasOffer ? offerPrice : regularPrice;
    const originalPrice = hasOffer && regularPrice > currentPrice ? regularPrice : undefined;

    // Calcular porcentaje de descuento cuando hay precio regular y precio oferta.
    let discountPercent: number | undefined;
    if (originalPrice && originalPrice > currentPrice) {
      discountPercent = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
    }
    
    return {
      id: p.id,
      name: p.name,
      description: p.short_description || p.description || '',
      price: currentPrice,
      originalPrice: discountPercent ? originalPrice : undefined,
      image: p.image || (p.images && p.images.length > 0 ? p.images[0].image : this.getPlaceholderImage(p.name)),
      category: p.categories && p.categories.length > 0 ? p.categories[0].name : '',
      categoryId: p.categories && p.categories.length > 0 ? p.categories[0].id : undefined,
      discount: discountPercent,
      tags: p.tags || ''
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
   * Filtra productos por categoría o tag seleccionado
   */
  getFilteredProducts(): ProductWithCategory[] {
    // Filtrar por tag si está activo
    if (this.currentTagFilter) {
      return this.products.filter(p => 
        p.tags?.toLowerCase().includes(this.currentTagFilter!.toLowerCase())
      );
    }
    
    // Filtrar por categoría
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
    if (this.slideInterval) {
      this.slideInterval.unsubscribe();
    }
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

  // Método para volver a la página principal (ya no se usa)
  goBackToCategories(): void {
    this.router.navigate(['/home']);
  }
}
