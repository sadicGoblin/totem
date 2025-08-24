import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { PrinterService, ProductoTicket } from '../../services/printer.service';
import { QRCodeModule } from 'angularx-qrcode';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, QRCodeModule],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.scss'
})
export class PaymentComponent {
  processingPayment = false;
  orderNumber = '';
  orderNumberPreview = '';
  cartTotal = 0;
  selectedMethod: 'cash' | 'mercadopago' | 'mobile' | 'card' | null = null;
  voucherPrinted = false;
  showMobilePopup = false;
  mobilePaymentUrl = '';
  
  constructor(
    private router: Router, 
    public cartService: CartService,
    private printerService: PrinterService
  ) {
    // Obtener el total del carrito
    this.cartService.getCartTotal().subscribe(total => {
      this.cartTotal = total;
    });
  }
  
  // Volver a la página anterior
  goBack(): void {
    this.router.navigate(['/checkout']);
  }
  
  // Formatear precio para mostrar como moneda
  formatPrice(price: number): string {
    return '$' + price.toLocaleString('es-CL');
  }
  
  // Seleccionar método de pago
  selectPaymentMethod(method: 'cash' | 'mercadopago' | 'mobile' | 'card'): void {
    this.selectedMethod = method;
    
    if(method === 'card') {
      // Para el pago con tarjeta, mostramos la interfaz especial
      // No activamos processingPayment porque usamos la vista específica
      
      // Aquí podríamos iniciar la comunicación con la máquina de pago
      // Por ahora solo simulamos un tiempo de espera para demo
      setTimeout(() => {
        // Simulamos un pago exitoso después de 10 segundos
        this.completeOrder();
      }, 10000);
    } else if(method === 'cash') {
      // Para pago en efectivo, generamos un número de pedido preliminar
      this.orderNumberPreview = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      
      // Aquí se imprimiría el voucher en la impresora térmica
      this.printVoucher();
      
      // No avanzamos automáticamente para que el cliente pueda ver la información
      // Esperará a que presionen el botón "ENTENDIDO"
    } else if(method === 'mobile') {
      // Para pago móvil, mostramos el popup con QR/link
      this.showMobilePaymentPopup();
    } else {
      // Para otros métodos (mercadopago), mostramos el spinner de procesamiento general
      this.processingPayment = true;
      
      // Simulamos un proceso de pago que toma tiempo
      setTimeout(() => {
        this.completeOrder();
      }, 3000);
    }
  }
  
  // Cancelar pago con tarjeta y volver a selección de método de pago
  cancelCardPayment(): void {
    this.selectedMethod = null;
  }
  
  // Método para imprimir el voucher en la impresora térmica
  printVoucher(): void {
    console.log('Preparando impresión del ticket de "Pagar en Caja"...');
    
    // Obtener los items del carrito una sola vez, sin suscripción
    const items = this.cartService.getCurrentCartItems();
    
    // Convertir los items del carrito al formato esperado por el plugin
    const productos: ProductoTicket[] = items.map(item => ({
      nombre: item.product.name,
      cantidad: item.quantity,
      precio: item.product.price
    }));

    // Enviar al plugin de impresión con el número de pedido
    this.printerService.imprimirTicket(productos, undefined, this.orderNumberPreview).subscribe({
      next: (response) => {
        if (response.resultado === 'ok') {
          console.log('Ticket impreso exitosamente');
          this.voucherPrinted = true;
          
          // Después de imprimir exitosamente, esperar 3 segundos y regresar al catálogo
          setTimeout(() => {
            this.completeOrderAndReturn();
          }, 6000);
        } else {
          console.error('Error al imprimir ticket:', response.mensaje);
          // En caso de error, también regresar después de un tiempo
          setTimeout(() => {
            this.completeOrderAndReturn();
          }, 6000);
        }
      },
      error: (error) => {
        console.error('Error de conexión con el servicio de impresión:', error);
        // En caso de error, también regresar después de un tiempo
        setTimeout(() => {
          this.completeOrderAndReturn();
        }, 2000);
      }
    });
  }
    
  
  // Mostrar popup de pago móvil
  showMobilePaymentPopup(): void {
    // Generar URL con SKUs del carrito actual
    this.mobilePaymentUrl = this.generateCartUrl();
    this.showMobilePopup = true;
  }

  // Generar URL con SKUs del carrito
  generateCartUrl(): string {
    const items = this.cartService.getCurrentCartItems();
    const skus = items.map(item => item.product.sku).join(',');
    const baseUrl = 'https://online-cart-b0981.web.app';
    return `${baseUrl}?skus=${skus}`;
  }

  // Cerrar popup de pago móvil
  closeMobilePopup(): void {
    this.showMobilePopup = false;
    this.selectedMethod = null;
  }

  // Copiar URL al portapapeles
  copyUrl(): void {
    navigator.clipboard.writeText(this.mobilePaymentUrl).then(() => {
      console.log('URL copiada al portapapeles');
      // Aquí podrías mostrar una notificación de éxito
    }).catch(err => {
      console.error('Error al copiar URL:', err);
    });
  }

  // Completar pedido móvil
  completeMobileOrder(): void {
    this.showMobilePopup = false;
    this.completeOrderAndReturn();
  }

  // Método simplificado para completar pedido y regresar al catálogo
  completeOrderAndReturn(): void {
    // Limpiar el carrito inmediatamente
    this.cartService.clearCart();
    
    // Regresar al catálogo principal
    this.router.navigate(['/']);
  }
  
  // Completar el pedido después del pago
  completeOrder(): void {
    // Ocultamos la pantalla de pago
    if(this.selectedMethod === 'card') {
      
      this.processingPayment = false;
    }
    
    // Generamos un número de orden aleatorio
    this.orderNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    // Limpiar el carrito
    setTimeout(() => {
      this.cartService.clearCart();
      // Redirigir a la página de confirmación
      this.router.navigate(['/checkout'], { queryParams: { orderComplete: 'true', orderNumber: this.orderNumber } });
    }, 1000);
  }
}
