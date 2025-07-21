import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { CartItem } from '../../models/products.model';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class CheckoutComponent implements OnInit {
  cartItems: CartItem[] = [];
  cartTotal: number = 0;
  orderComplete: boolean = false;
  processingPayment: boolean = false;
  orderNumber: string = '';

  constructor(private cartService: CartService, private router: Router) {}

  ngOnInit(): void {
    this.cartService.getCartItems().subscribe(items => {
      this.cartItems = items;
      
      // Si el carrito está vacío, redirigimos a home
      if (this.cartItems.length === 0) {
        this.router.navigate(['/home']);
      }
    });

    this.cartService.getCartTotal().subscribe(total => {
      this.cartTotal = total;
    });
  }

  // Formatear precio para mostrarlo con separador de miles y signo $
  formatPrice(price: number): string {
    return '$' + price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  // Método para incrementar la cantidad de un producto
  increaseQuantity(item: CartItem): void {
    item.quantity++;
    this.updateCart();
  }

  // Método para decrementar la cantidad de un producto
  decreaseQuantity(item: CartItem): void {
    if (item.quantity > 1) {
      item.quantity--;
      this.updateCart();
    }
  }

  // Actualizar el carrito en el servicio
  updateCart(): void {
    this.cartService.updateCart([...this.cartItems]);
  }

  // Iniciar proceso de pago
  startPayment(): void {
    this.processingPayment = true;
    
    // Simulamos un proceso de pago que toma tiempo
    // En un caso real, aquí se comunicaría con el terminal de pago
    setTimeout(() => {
      this.completeOrder();
    }, 5000);
  }

  // Completar el pedido después del pago
  completeOrder(): void {
    // Ocultamos la pantalla de pago
    this.processingPayment = false;
    
    // Generamos un número de orden aleatorio
    this.orderNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.orderComplete = true;
    
    // Opcional: En un caso real, aquí enviarías los datos a un servidor
    // this.orderService.sendOrder(this.cartItems, this.cartTotal).subscribe(...);
    
    // Limpiar el carrito
    setTimeout(() => {
      this.cartService.clearCart();
    }, 5000);
  }

  // Volver a la página principal
  goToHome(): void {
    this.router.navigate(['/home']);
  }
}
