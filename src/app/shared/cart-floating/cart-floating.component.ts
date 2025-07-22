import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { CartItem } from '../../models/products.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cart-floating',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cart-floating.component.html',
  styleUrl: './cart-floating.component.scss',
})
export class CartFloatingComponent implements OnInit, OnDestroy {
  cartItems: CartItem[] = [];
  cartTotal: number = 0;
  cartItemCount: number = 0;
  showCart: boolean = false;
  private subscriptions: any[] = [];

  constructor(
    private router: Router,
    private cartService: CartService,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.subscribeToCart();
  }

  // Limpieza al destruir el componente
  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private subscribeToCart(): void {
    // Suscribirse a los items del carrito
    this.subscriptions.push(
      this.cartService.getCartItems().subscribe((items) => {
        this.cartItems = items;
      })
    );

    // Suscribirse al total del carrito
    this.subscriptions.push(
      this.cartService.getCartTotal().subscribe((total) => {
        this.cartTotal = total;
      })
    );

    // Suscribirse al contador de items
    this.subscriptions.push(
      this.cartService.getCartCount().subscribe((count) => {
        this.cartItemCount = count;
      })
    );
  }

  decreaseQuantity(productId: number): void {
    this.cartService.decreaseQuantity(productId);
  }
  
  formatPrice(price: number): string {
    return '$ ' + price.toLocaleString('es-CL');
  }

  goToCheckout(): void {
    // Cerramos el carrito antes de navegar
    this.showCart = false;
    
    // Navegamos a la página de checkout
    this.router.navigate(['/checkout']);
  }
}
