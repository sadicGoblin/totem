import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product, CartItem } from '../models/products.model';
import { ProductService } from '../services/product.service';
import { CartService } from '../services/cart.service';
import { ModalComponent } from '../components/modal/modal.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  host: {
    '[class.landscape-mode]': 'isLandscapeMode'
  }
})
export class HomeComponent implements OnInit {
  isLandscapeMode: boolean = false;
  selectedCategory: string | null = 'HAMBURGUESAS';
  cartItems: CartItem[] = [];
  cartTotal: number = 0;
  cartItemCount: number = 0;
  showCart: boolean = false;
  
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

  constructor(private productService: ProductService, private cartService: CartService, private router: Router) {
    this.checkOrientation();
  }

  ngOnInit(): void {
    this.productService.getProducts().subscribe(products => {
      this.products = products;
    });
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
    const existingItem = this.cartItems.find(item => item.productId === product.id);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      this.cartItems.push({
        productId: product.id,
        product: product,
        quantity: 1
      });
    }
    
    this.updateCartTotals();
  }
  
  decreaseQuantity(product: Product): void {
    const index = this.cartItems.findIndex(item => item.productId === product.id);
    
    if (index !== -1) {
      if (this.cartItems[index].quantity > 1) {
        this.cartItems[index].quantity -= 1;
      } else {
        this.cartItems.splice(index, 1);
      }
      this.updateCartTotals();
    }
  }
  
  updateCartTotals(): void {
    this.cartItemCount = this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
    this.cartTotal = this.cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    
    // Actualizar el servicio de carrito para compartir datos entre componentes
    this.cartService.updateCart(this.cartItems);
  }
  
  getItemQuantityInCart(productId: number): number {
    const item = this.cartItems.find(item => item.productId === productId);
    return item ? item.quantity : 0;
  }
  
  // Modal methods
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
    
    // Buscar el producto en el carrito
    const existingItem = this.cartItems.find(item => item.productId === product.id);
    
    if (existingItem) {
      // Si el producto ya está en el carrito, actualizar la cantidad
      existingItem.quantity = quantity;
    } else {
      // Si el producto no está en el carrito, agregarlo
      this.cartItems.push({
        productId: product.id,
        product: product,
        quantity: quantity
      });
    }
    
    // Actualizar el total y el contador del carrito
    this.updateCartTotals();
  }
  
  // Método para navegar a la página de checkout
  goToCheckout(): void {
    // Cerramos el carrito antes de navegar
    this.showCart = false;
    
    // Actualizamos el servicio de carrito con los items actuales
    this.cartService.updateCart(this.cartItems);
    
    // Navegamos a la página de checkout
    this.router.navigate(['/checkout']);
  }
}
