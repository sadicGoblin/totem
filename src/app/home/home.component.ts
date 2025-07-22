import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product, CartItem } from '../models/products.model';
import { ProductService } from '../services/product.service';
import { CartService } from '../services/cart.service';
import { ModalComponent } from '../components/modal/modal.component';
import { CartFloatingComponent } from '../shared/cart-floating/cart-floating.component';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ModalComponent, CartFloatingComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  host: {
    '[class.landscape-mode]': 'isLandscapeMode'
  }
})
export class HomeComponent implements OnInit, OnDestroy {
  isLandscapeMode: boolean = false;
  selectedCategory: string | null = 'HAMBURGUESAS';
  hideNavButtons: boolean = false; // Para ocultar los botones de navegación
  
  // Subscripciones
  private subscriptions: any[] = [];
  
  // Modal properties
  selectedProduct: Product | null = null;
  showModal: boolean = false;
  
  categories = [
    'HAMBURGUESAS',
    'PIZZAS',
    'BEBIDAS',
    'POSTRES',
    'COMPLEMENTOS'
  ];
  
  products: Product[] = [];

  constructor(
    private productService: ProductService, 
    private cartService: CartService, 
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.checkOrientation();
  }

  ngOnInit(): void {
    // Cargar productos
    this.productService.getProducts().subscribe(products => {
      this.products = products;
      
      // Verificar si hay un parámetro de categoría en la URL
      this.route.queryParams.subscribe(params => {
        if (params['category']) {
          const category = params['category'].toUpperCase();
          // Verificar si la categoría existe en nuestras categorías
          if (category === 'ALL') {
            this.selectedCategory = null;
          } else if (this.categories.includes(category) || category === 'TODO') {
            this.selectedCategory = category;
          }
          
          // Indicar que venimos de la página de categorías para ocultar los botones de navegación
          this.hideNavButtons = true;
        }
      });
    });
    
    // Ya no necesitamos suscribirnos al carrito, lo maneja CartFloatingComponent
  }

  @HostListener('window:resize')
  checkOrientation(): void {
    this.isLandscapeMode = window.innerWidth > window.innerHeight;
  }

  setCategory(category: string | null): void {
    this.selectedCategory = category;
  }

  getFilteredProducts(): Product[] {
    return this.selectedCategory === null 
      ? this.products 
      : this.products.filter(p => p.category === this.selectedCategory);
  }
  
  formatPrice(price: number): string {
    return '$' + price.toLocaleString('es-CL');
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
    this.subscriptions.forEach(sub => sub.unsubscribe());
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
  handleAddToCartFromModal(data: {product: Product, quantity: number}): void {
    const { product, quantity } = data;
    
    // Obtener items actuales del carrito
    const currentItems = this.cartService.getCurrentCartItems();
    
    // Buscar el producto en el carrito
    const existingItemIndex = currentItems.findIndex(item => item.product.id === product.id);
    
    let updatedItems: CartItem[];
    
    if (existingItemIndex !== -1) {
      // Si el producto ya está en el carrito, actualizar la cantidad
      updatedItems = [...currentItems];
      updatedItems[existingItemIndex].quantity = quantity;
    } else {
      // Si el producto no está en el carrito, agregarlo
      updatedItems = [...currentItems, {
        productId: product.id,
        product: product,
        quantity: quantity
      }];
    }
    
    // Actualizar el carrito a través del servicio
    this.cartService.updateCart(updatedItems);
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
