import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { CartItem } from '../../models/products.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-mobile-cart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mobile-cart.component.html',
  styleUrls: ['./mobile-cart.component.scss']
})
export class MobileCartComponent implements OnInit {
  cartItems$: Observable<CartItem[]>;
  cartTotal$: Observable<number>;
  cartCount$: Observable<number>;

  constructor(
    private cartService: CartService,
    private router: Router
  ) {
    this.cartItems$ = this.cartService.getCartItems();
    this.cartTotal$ = this.cartService.getCartTotal();
    this.cartCount$ = this.cartService.getCartCount();
  }

  ngOnInit(): void {}

  // Incrementar cantidad de un producto
  increaseQuantity(productId: number): void {
    const currentItems = this.cartService.getCurrentCartItems();
    const item = currentItems.find(item => item.product.id === productId);
    if (item) {
      this.cartService.addToCart(item.product);
    }
  }

  // Decrementar cantidad de un producto
  decreaseQuantity(productId: number): void {
    this.cartService.decreaseQuantity(productId);
  }

  // Eliminar producto del carrito
  removeFromCart(productId: number): void {
    this.cartService.removeFromCart(productId);
  }

  // Limpiar todo el carrito
  clearCart(): void {
    if (confirm('¿Estás seguro de que quieres vaciar tu carrito?')) {
      this.cartService.clearCart();
    }
  }

  // Navegar al catálogo para seguir comprando
  continueShopping(): void {
    this.router.navigate(['/category']);
  }

  // Proceder al checkout (próxima implementación)
  proceedToCheckout(): void {
    this.router.navigate(['/checkout']);
  }

  // Formatear precio
  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price);
  }

  // Compartir carrito (generar enlace)
  shareCart(): void {
    const cartItems = this.cartService.getCurrentCartItems();
    const skus = cartItems.map(item => item.product.sku).join(',');
    const shareUrl = `${window.location.origin}?skus=${skus}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Mi Carrito de Compras',
        text: 'Mira los productos que seleccioné',
        url: shareUrl
      });
    } else {
      // Fallback: copiar al portapapeles
      navigator.clipboard.writeText(shareUrl).then(() => {
        this.showNotification('Enlace copiado al portapapeles');
      });
    }
  }

  // TrackBy function para optimizar el rendimiento de *ngFor
  trackByProductId(index: number, item: CartItem): number {
    return item.product.id;
  }

  private showNotification(message: string): void {
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #2196F3;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        font-family: Arial, sans-serif;
        animation: slideIn 0.3s ease-out;
      ">
        ${message}
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 2000);
  }
}
