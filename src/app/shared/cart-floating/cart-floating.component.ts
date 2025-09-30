import { Component, OnDestroy, OnInit, ElementRef, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { CartItem, getProductPrice } from '../../models/products.model';
import { CommonModule } from '@angular/common';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-cart-floating',
  standalone: true,
  imports: [CommonModule, ConfirmModalComponent],
  templateUrl: './cart-floating.component.html',
  styleUrl: './cart-floating.component.scss',
})
export class CartFloatingComponent implements OnInit, OnDestroy {
  cartItems: CartItem[] = [];
  cartTotal: number = 0;
  cartItemCount: number = 0;
  showCart: boolean = false;
  private subscriptions: any[] = [];
  
  // Para el modal de confirmación
  showConfirmModal: boolean = false;
  confirmMessage: string = '¿Estás seguro de que deseas vaciar todo el carrito?';

  constructor(
    private router: Router,
    private cartService: CartService,
    private productService: ProductService,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.subscribeToCart();
  }

  // Propiedad para evitar cerrar el carrito inmediatamente al abrirlo
  private isOpeningCart: boolean = false;

  // Manejador para mostrar/ocultar carrito
  toggleCart(): void {
    if (!this.showCart) {
      // Está abriendo el carrito
      this.isOpeningCart = true;
      setTimeout(() => {
        this.isOpeningCart = false;
      }, 100);
    }
    this.showCart = !this.showCart;
  }
  
  // Cerrar carrito al hacer clic fuera de él
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // No cerrar si el carrito no está visible o si se está abriendo
    if (!this.showCart || this.isOpeningCart) return;
    
    // Comprobar si el clic fue dentro del carrito o en el botón de carrito
    const cartDetail = this.elementRef.nativeElement.querySelector('.cart-detail');
    const cartButton = this.elementRef.nativeElement.querySelector('.cart-floating-button');
    
    if (!cartDetail || !cartButton) return;
    
    const clickedInCart = cartDetail.contains(event.target as Node);
    const clickedInButton = cartButton.contains(event.target as Node);
    
    // Si el clic fue fuera del carrito y del botón, cerrar el carrito
    if (!clickedInCart && !clickedInButton) {
      this.showCart = false;
    }
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

  decreaseQuantity(productId: number, event?: MouseEvent): void {
    // Detener la propagación del evento para evitar que se cierre el carrito
    if (event) {
      event.stopPropagation();
    }
    this.cartService.decreaseQuantity(productId);
  }
  
  // Método para aumentar la cantidad de un producto en el carrito
  increaseQuantity(product: any, event?: MouseEvent): void {
    // Detener la propagación del evento para evitar que se cierre el carrito
    if (event) {
      event.stopPropagation();
    }
    this.cartService.addToCart(product);
  }
  
  // Método para eliminar un producto del carrito completamente
  removeFromCart(productId: number, event?: MouseEvent): void {
    // Detener la propagación del evento para evitar que se cierre el carrito
    if (event) {
      event.stopPropagation();
    }
    this.cartService.removeFromCart(productId);
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
  
  getPrice(item: CartItem): number {
    return getProductPrice(item.product);
  }
  
  // Método para mostrar el modal de confirmación para vaciar carrito
  clearCart(event?: MouseEvent): void {
    // Detener la propagación del evento para evitar que se cierre el carrito
    if (event) {
      event.stopPropagation();
    }
    
    // Mostrar modal de confirmación
    this.showConfirmModal = true;
  }
  
  // Método que se ejecuta cuando se confirma vaciar el carrito
  confirmClearCart(): void {
    this.cartService.clearCart();
    // Los observables del servicio actualizarán automáticamente los items del carrito
  }

  goToCheckout(): void {
    // Cerramos el carrito antes de navegar
    this.showCart = false;
    
    // Navegamos a la página de checkout
    this.router.navigate(['/checkout']);
  }
}
