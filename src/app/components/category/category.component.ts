import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { CartFloatingComponent } from '../../shared/cart-floating/cart-floating.component';
import { ModalComponent } from '../modal/modal.component';
import { Product } from '../../models/products.model';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule, CartFloatingComponent, ModalComponent],
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.scss']
})
export class CategoryComponent implements OnInit, OnDestroy {
  
  // Categoría seleccionada actualmente
  selectedCategory: string = 'promociones';
  
  // Tamaño de pizza seleccionado
  selectedSize: string = 'TODOS';
  
  // Productos cargados
  products: Product[] = [];
  
  // Modal properties
  selectedProduct: Product | null = null;
  showModal: boolean = false;
  
  // Subscripciones
  private subscriptions: any[] = [];

  // Categorías disponibles (basadas en la imagen)
  categories = [
    'promociones',
    'pizzas', 
    'acompañamiento',
    'bebidas',
    'postres',
    'extras'
  ];
  
  constructor(
    private router: Router,
    private cartService: CartService,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    // Cargar productos
    this.productService.getProducts().subscribe((products) => {
      this.products = products;
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  /**
   * Selecciona una categoría y filtra los productos
   */
  selectCategory(category: string): void {
    this.selectedCategory = category;
    // Resetear filtro de tamaño cuando cambia la categoría
    this.selectedSize = 'TODOS';
  }

  /**
   * Selecciona un tamaño de pizza para filtrar
   */
  selectSize(size: string): void {
    this.selectedSize = size;
  }

  /**
   * Obtiene el nombre de display de la categoría
   */
  getCategoryDisplayName(category: string): string {
    const displayNames: { [key: string]: string } = {
      'promociones': 'PROMOCIONES',
      'pizzas': 'PIZZAS',
      'acompañamiento': 'ACOMPAÑAMIENTO', 
      'bebidas': 'BEBIDAS',
      'postres': 'POSTRES',
      'extras': 'EXTRAS'
    };
    return displayNames[category] || category.toUpperCase();
  }

  /**
   * Filtra productos por categoría seleccionada y tamaño (para pizzas)
   */
  getFilteredProducts(): Product[] {
    if (!this.selectedCategory) {
      return this.products;
    }
    
    // Mapear categorías del sidebar a categorías de productos
    const categoryMapping: { [key: string]: string } = {
      'promociones': 'PROMOCIONES',
      'pizzas': 'PIZZAS',
      'acompañamiento': 'ACOMPAÑAMIENTO',
      'bebidas': 'BEBIDAS', 
      'postres': 'POSTRES',
      'extras': 'EXTRAS'
    };
    
    const mappedCategory = categoryMapping[this.selectedCategory];
    let filteredProducts = this.products.filter(p => 
      p.category.toUpperCase() === mappedCategory?.toUpperCase()
    );

    // Aplicar filtro por tamaño solo para pizzas
    if (this.selectedCategory === 'pizzas' && this.selectedSize !== 'TODOS') {
      filteredProducts = filteredProducts.filter(p => 
        p.size === this.selectedSize
      );
    }

    return filteredProducts;
  }

  /**
   * Formatea el precio para mostrar
   */
  formatPrice(price: number): string {
    return '$' + price.toLocaleString('es-CL');
  }

  /**
   * Añade un producto al carrito
   */
  addToCart(product: Product): void {
    this.cartService.addToCart(product);
  }

  /**
   * Disminuye la cantidad de un producto en el carrito
   */
  decreaseQuantity(product: Product): void {
    this.cartService.decreaseQuantity(product.id);
  }

  /**
   * Obtiene la cantidad de un producto en el carrito
   */
  getItemQuantityInCart(productId: number): number {
    return this.cartService.getItemQuantity(productId);
  }

  /**
   * Abre el modal de detalles del producto
   */
  openProductModal(product: Product): void {
    this.selectedProduct = product;
    this.showModal = true;
  }

  /**
   * Cierra el modal
   */
  closeModal(): void {
    this.showModal = false;
    this.selectedProduct = null;
  }

  /**
   * Maneja la adición de productos desde el modal
   */
  handleAddToCartFromModal(data: { product: Product; quantity: number }): void {
    const { product, quantity } = data;

    if (quantity > 0) {
      this.cartService.addToCart(product);
    } else if (quantity < 0) {
      this.cartService.decreaseQuantity(product.id);
    }
  }

  /**
   * Navega hacia atrás (order-type)
   */
  goBack(): void {
    this.router.navigate(['/order-type']);
  }

  /**
   * Navega al checkout
   */
  goToCheckout(): void {
    this.router.navigate(['/checkout']);
  }
}
