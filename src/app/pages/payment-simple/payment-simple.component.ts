import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-payment-simple',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-simple.component.html',
  styleUrl: './payment-simple.component.scss'
})
export class PaymentSimpleComponent implements OnInit, OnDestroy {
  orderNumberPreview = '';
  cartTotal = 0;
  voucherPrinted = false;
  printingVoucher = false;
  printError = false;

  // Mascota animada
  mascotImages = [
    'assets/images/papa-johns-mascot.png',
    'assets/images/papa-johns-mascot-2.png',
    'assets/images/papa-johns-mascot-3.png',
    'assets/images/papa-johns-mascot-4.png'
  ];

  mascotMessages = [
    '¡Tu pedido está casi listo!',
    '¡Lleva tu voucher a caja!',
    '¡Gracias por tu compra!',
    '¡Que disfrutes tu pizza!'
  ];

  currentMascotImage = this.mascotImages[0];
  currentMessage = this.mascotMessages[0];
  showMascot = true;
  showMessage = false;
  private mascotIntervalId: any;

  // Items del carrito para impresión
  private cartItemsForPrint: any[] = [];

  constructor(private router: Router, private cartService: CartService) {
    this.cartService.getCartTotal().subscribe(total => {
      this.cartTotal = total;
    });

    this.cartService.getCartItems().subscribe(items => {
      this.cartItemsForPrint = items.map(item => ({
        nombre: item.product.name,
        cantidad: item.quantity,
        precio: item.product.price
      }));
    });
  }

  ngOnInit() {
    // No iniciar mascota hasta que se esté imprimiendo
  }

  ngOnDestroy() {
    if (this.mascotIntervalId) {
      clearInterval(this.mascotIntervalId);
    }
  }

  goBack(): void {
    this.router.navigate(['/checkout']);
  }

  formatPrice(price: number): string {
    return '$' + price.toLocaleString('es-CL');
  }

  // Solo método activo: Pagar en Caja
  payAtCounter(): void {
    this.orderNumberPreview = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.printingVoucher = true;
    this.printError = false;

    // Iniciar animación de mascota
    this.startMascotAnimation();

    // Imprimir voucher
    this.printVoucher();
  }

  private startMascotAnimation(): void {
    // Mostrar primer mensaje inmediatamente
    this.showMessage = true;

    this.mascotIntervalId = setInterval(() => {
      const randomMascotIndex = Math.floor(Math.random() * this.mascotImages.length);
      const randomMessageIndex = Math.floor(Math.random() * this.mascotMessages.length);

      this.currentMascotImage = this.mascotImages[randomMascotIndex];
      this.currentMessage = this.mascotMessages[randomMessageIndex];

      this.showMessage = true;
      setTimeout(() => {
        this.showMessage = false;
      }, 2500);
    }, 4000);
  }

  private printVoucher(): void {
    console.log('🖨️ Enviando datos al servidor de impresión...');

    if (!this.cartItemsForPrint || this.cartItemsForPrint.length === 0) {
      console.error('No hay items para imprimir');
      this.printError = true;
      return;
    }

    const payload: any = {
      productos: this.cartItemsForPrint,
      numeroPedido: this.orderNumberPreview
    };

    console.log('Payload a enviar:', payload);

    fetch('http://localhost:8000/imprimir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(res => {
      if (!res.ok) {
        throw new Error(`Error del servidor: ${res.status}`);
      }
      return res.json();
    })
    .then(result => {
      console.log('Resultado de la impresión:', result);
      if (result.resultado === 'ok') {
        this.voucherPrinted = true;
        console.log('✅ Voucher impreso correctamente');
      } else {
        console.error('Error en la impresión:', result.mensaje);
        this.printError = true;
      }
    })
    .catch(err => {
      console.error('Error enviando a la impresora:', err);
      this.printError = true;
    });
  }

  // Reintentar impresión
  retryPrint(): void {
    this.printError = false;
    this.printVoucher();
  }

  // Confirmar y volver al inicio
  confirmAndGoHome(): void {
    this.cartService.clearCart();
    this.router.navigate(['/']);
  }
}
