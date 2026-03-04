import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { CatalogueService } from '../../services/catalogue.service';
import { PrinterService, ProductoTicket } from '../../services/printer.service';
import { TransbankService, TransactionState, PaymentResponse } from '../../services/transbank.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.scss'
})
export class PaymentComponent implements OnDestroy {
  processingPayment = false;
  orderNumber = '';
  orderNumberPreview = '';
  cartTotal = 0;
  selectedMethod: 'cash' | 'mercadopago' | 'amipass' | 'card' | null = null;
  voucherPrinted = false;
  
  // Estado de Transbank
  transbankState: TransactionState = 'IDLE';
  transbankMessage = '';
  transbankConnected = false;
  
  // Subscripciones
  private stateSubscription?: Subscription;
  private messageSubscription?: Subscription;

  get storeLogo(): string {
    return this.catalogueService.getClientConfiguration()?.logo_url || 
           this.catalogueService.getClientConfiguration()?.logo || 
           '';
  }
  
  constructor(
    private router: Router, 
    private cartService: CartService,
    private printerService: PrinterService,
    private catalogueService: CatalogueService,
    private transbankService: TransbankService
  ) {
    // Obtener el total del carrito
    this.cartService.getCartTotal().subscribe(total => {
      this.cartTotal = total;
    });
    
    // Suscribirse a cambios de estado de Transbank
    this.stateSubscription = this.transbankService.currentState$.subscribe(state => {
      this.transbankState = state;
      console.log(`💳 Estado Transbank: ${state}`);
    });
    
    this.messageSubscription = this.transbankService.statusMessage$.subscribe(message => {
      this.transbankMessage = message;
    });
    
    // Verificar conexión con servicio Transbank al iniciar
    this.checkTransbankConnection();
  }
  
  ngOnDestroy(): void {
    this.stateSubscription?.unsubscribe();
    this.messageSubscription?.unsubscribe();
    this.transbankService.stopStatusPolling();
  }
  
  // Verificar conexión con el servicio Transbank
  private checkTransbankConnection(): void {
    this.transbankService.healthCheck().subscribe(response => {
      this.transbankConnected = response.status !== 'error';
      console.log(`🏦 Servicio Transbank: ${this.transbankConnected ? 'CONECTADO' : 'NO DISPONIBLE'}`);
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
  selectPaymentMethod(method: 'cash' | 'mercadopago' | 'amipass' | 'card'): void {
    this.selectedMethod = method;
    
    if(method === 'card') {
      // Iniciar pago con Transbank
      console.log('💳 Iniciando pago con Transbank...');
      
      this.transbankService.iniciarPago(this.cartTotal).subscribe({
        next: (response: PaymentResponse) => {
          console.log('🏦 Respuesta Transbank:', response);
          
          if (response.success) {
            // Pago exitoso
            console.log('✅ Pago APROBADO - Código:', response.authorizationCode);
            this.completeOrder();
          } else {
            // Pago rechazado o error
            console.log('❌ Pago rechazado:', response.message);
            this.transbankMessage = response.message;
            
            // Volver a selección después de mostrar el mensaje
            setTimeout(() => {
              this.selectedMethod = null;
              this.transbankState = 'IDLE';
            }, 3000);
          }
        },
        error: (error) => {
          console.error('❌ Error en pago Transbank:', error);
          this.transbankMessage = 'Error de conexión con el POS';
          setTimeout(() => {
            this.selectedMethod = null;
          }, 3000);
        }
      });
    } else if(method === 'cash') {
      // Para pago en efectivo, generamos un número de pedido preliminar
      this.orderNumberPreview = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      
      // Aquí se imprimiría el voucher en la impresora térmica
      this.printVoucher();
      
      // No avanzamos automáticamente para que el cliente pueda ver la información
      // Esperará a que presionen el botón "ENTENDIDO"
    } else {
      // Para otros métodos (mercadopago, amipass), mostramos el spinner de procesamiento general
      this.processingPayment = true;
      
      // Simulamos un proceso de pago que toma tiempo
      setTimeout(() => {
        this.completeOrder();
      }, 3000);
    }
  }
  
  // Cancelar pago con tarjeta y volver a selección de método de pago
  cancelCardPayment(): void {
    console.log('🚫 Cancelando pago con tarjeta...');
    
    // Verificar si se puede cancelar en el estado actual
    if (this.transbankService.canCancelInState(this.transbankState)) {
      this.transbankService.cancelarPago().subscribe({
        next: (response) => {
          console.log('🚫 Respuesta cancelación:', response);
          if (response.success) {
            this.selectedMethod = null;
            this.transbankState = 'IDLE';
          } else {
            // No se pudo cancelar (probablemente ESPERANDO_TARJETA)
            console.log('⚠️ No se pudo cancelar:', response.failureReason);
            this.transbankMessage = response.message;
          }
        },
        error: (error) => {
          console.error('❌ Error al cancelar:', error);
        }
      });
    } else if (this.transbankState === 'ESPERANDO_TARJETA') {
      // No se puede cancelar desde la app cuando espera tarjeta
      this.transbankMessage = 'Presione CANCELAR en el POS para salir';
      console.log('⚠️ No se puede cancelar - POS esperando tarjeta');
    } else {
      // Estado IDLE o finalizado, simplemente volver
      this.selectedMethod = null;
    }
  }
  
  // Obtener mensaje de estado para mostrar en UI
  getTransbankDisplayMessage(): string {
    if (this.transbankMessage) {
      return this.transbankMessage;
    }
    return this.transbankService.getMessageForState(this.transbankState);
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
