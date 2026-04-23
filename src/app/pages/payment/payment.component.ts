import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { CatalogueService } from '../../services/catalogue.service';
import { CartItem } from '../../models/products.model';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.scss'
})
export class PaymentComponent implements OnInit, OnDestroy {
  private readonly REFRESH_AFTER_PURCHASE_FLAG = 'totem_refresh_after_purchase';
  processingPayment = true;
  orderNumber = '';
  cartTotal = 0;
  cartItems: CartItem[] = [];
  totalItems = 0;
  paymentStatusMessage = 'Conectando con terminal Transbank (PAX)...';
  private cardPaymentTimeout: ReturnType<typeof setTimeout> | null = null;
  private statusTimeout: ReturnType<typeof setTimeout> | null = null;

  get storeLogo(): string {
    return this.catalogueService.getClientConfiguration()?.logo_url || 
           this.catalogueService.getClientConfiguration()?.logo || 
           '';
  }
  
  constructor(
    private router: Router, 
    private cartService: CartService,
    private catalogueService: CatalogueService
  ) {
    this.cartService.getCartTotal().subscribe(total => (this.cartTotal = total));
    this.cartService.getCartItems().subscribe(items => {
      this.cartItems = items;
      this.totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
    });
  }

  ngOnInit(): void {
    if (this.totalItems === 0) {
      this.router.navigate(['/checkout']);
      return;
    }

    this.startCardPayment();
  }
  
  // Volver a la página anterior
  goBack(): void {
    this.clearPaymentTimers();
    this.router.navigate(['/checkout']);
  }
  
  // Formatear precio para mostrar como moneda
  formatPrice(price: number): string {
    return '$' + price.toLocaleString('es-CL');
  }
  
  startCardPayment(): void {
    this.processingPayment = true;
    this.paymentStatusMessage = 'Conectando con terminal Transbank (PAX)...';

    this.statusTimeout = setTimeout(() => {
      this.paymentStatusMessage = 'Esperando confirmacion de pago en terminal...';
    }, 2500);

    // TODO: Reemplazar esta simulación por integración real con PAX/Transbank.
    this.cardPaymentTimeout = setTimeout(() => {
      this.completeOrder();
    }, 9000);
  }
  
  // Cancelar pago con tarjeta y volver al checkout
  cancelCardPayment(): void {
    this.clearPaymentTimers();
    this.processingPayment = false;
    this.router.navigate(['/checkout']);
  }
  
  // Completar el pedido después del pago
  completeOrder(): void {
    this.clearPaymentTimers();
    this.processingPayment = false;
    
    // Generamos un número de orden aleatorio
    this.orderNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    // Marcar refresh pendiente y refrescar catálogo en segundo plano
    localStorage.setItem(this.REFRESH_AFTER_PURCHASE_FLAG, '1');
    this.catalogueService.refreshCatalogue()
      .then(() => {
        localStorage.removeItem(this.REFRESH_AFTER_PURCHASE_FLAG);
      })
      .catch(() => {
        // Si falla, dejamos la flag para reintentar en Home
      });

    // Limpiar el carrito
    setTimeout(() => {
      this.cartService.clearCart();
      // Volver al inicio después de una compra exitosa
      this.router.navigate(['/home']);
    }, 1000);
  }

  private clearPaymentTimers(): void {
    if (this.cardPaymentTimeout) {
      clearTimeout(this.cardPaymentTimeout);
      this.cardPaymentTimeout = null;
    }

    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
      this.statusTimeout = null;
    }
  }

  ngOnDestroy(): void {
    this.clearPaymentTimers();
  }
}
