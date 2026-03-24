import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { CatalogueService } from '../../services/catalogue.service';
import { PrinterService, ProductoTicket, TransaccionTicket } from '../../services/printer.service';
import { TransbankService, TransactionState, PaymentResponse } from '../../services/transbank.service';
import { IdleService } from '../../services/idle.service';
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
  
  // Pantalla de éxito
  paymentSuccess = false;
  lastPaymentResponse: PaymentResponse | null = null;
  receiptPrinted = false;
  
  // Subscripciones
  private stateSubscription?: Subscription;
  private messageSubscription?: Subscription;
  private paymentSubscription?: Subscription;

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
    private transbankService: TransbankService,
    private idleService: IdleService
  ) {
    // Pausar timer de inactividad mientras se procesa el pago
    this.idleService.pause();
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
    
    // Verificar conexión con servicio Transbank e iniciar pago directo
    this.checkTransbankConnection();
    
    // Auto-iniciar pago con tarjeta (solo tarjeta soportada)
    this.selectedMethod = 'card';
    this.transbankState = 'IDLE';
    this.transbankMessage = '';
    this.startCardPayment();
  }
  
  ngOnDestroy(): void {
    this.stateSubscription?.unsubscribe();
    this.messageSubscription?.unsubscribe();
    this.transbankService.stopStatusPolling();
    
    // Reanudar timer de inactividad al salir de la pantalla de pago
    this.idleService.resume();
    
    // Si hay un pago pendiente al destruir el componente, cancelarlo
    if (this.paymentSubscription) {
      console.log('🚫 Componente destruido - abortando pago pendiente');
      this.paymentSubscription.unsubscribe();
      this.paymentSubscription = undefined;
      
      // Notificar al backend que cancele la transacción
      this.transbankService.cancelarPago().subscribe();
    }
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
      // Resetear estado previo antes de iniciar
      this.transbankState = 'IDLE';
      this.transbankMessage = '';
      this.startCardPayment();
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
  
  // Iniciar pago con tarjeta (usado al seleccionar y al reintentar)
  private startCardPayment(): void {
    console.log('💳 Iniciando pago con Transbank...');
    
    // Cancelar suscripción anterior si existe
    this.paymentSubscription?.unsubscribe();
    
    this.paymentSubscription = this.transbankService.iniciarPago(this.cartTotal).subscribe({
      next: (response: PaymentResponse) => {
        console.log('🏦 Respuesta Transbank:', response);
        
        if (response.success) {
          console.log('✅ Pago APROBADO - Código:', response.authorizationCode);
          this.lastPaymentResponse = response;
          this.showPaymentSuccess();
        } else {
          console.log('❌ Pago rechazado:', response.message);
          this.transbankMessage = response.message;
        }
      },
      error: (error) => {
        console.error('❌ Error en pago Transbank:', error);
        this.transbankMessage = 'Error de conexión con el terminal de pago';
        this.transbankState = 'ERROR';
      }
    });
  }
  
  // Reintentar pago con tarjeta
  retryCardPayment(): void {
    console.log('🔄 Reintentando pago con tarjeta...');
    this.transbankState = 'IDLE';
    this.transbankMessage = '';
    this.startCardPayment();
  }
  
  // Volver al checkout desde pantalla de tarjeta
  goBackFromCard(): void {
    this.transbankState = 'IDLE';
    this.transbankMessage = '';
    this.transbankService.stopStatusPolling();
    this.router.navigate(['/checkout']);
  }
  
  // Cancelar pago con tarjeta y volver al checkout
  cancelCardPayment(): void {
    console.log('🚫 Cancelando pago con tarjeta...');
    
    // Abortar la suscripción HTTP al endpoint /pagar
    this.paymentSubscription?.unsubscribe();
    this.paymentSubscription = undefined;
    
    // Siempre llamar al endpoint de cancelación en el backend
    // Esto forzará al servidor a abortar la transacción en el POS
    this.transbankService.cancelarPago().subscribe({
      next: (response) => {
        console.log('🚫 Respuesta cancelación:', response);
      },
      error: (error) => {
        console.error('❌ Error al cancelar:', error);
      }
    });
    
    // Detener polling y navegar inmediatamente
    this.transbankService.stopStatusPolling();
    this.router.navigate(['/checkout']);
  }
  
  // Obtener mensaje de estado para mostrar en UI
  getTransbankDisplayMessage(): string {
    if (this.transbankMessage) {
      return this.transbankMessage;
    }
    return this.transbankService.getMessageForState(this.transbankState);
  }
  
  // Obtener etiqueta amigable para el estado (sin guiones bajos)
  getTransbankFriendlyState(): string {
    const labels: Record<string, string> = {
      'IDLE': 'Disponible',
      'INICIANDO_PAGO': 'Iniciando pago',
      'ESPERANDO_TARJETA': 'Esperando tarjeta',
      'PROCESANDO': 'Procesando',
      'APROBADO': 'Aprobado',
      'RECHAZADO': 'Rechazado',
      'CANCELADO': 'Cancelado',
      'ERROR': 'Error'
    };
    return labels[this.transbankState] || this.transbankState;
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
  
  // Mostrar pantalla de éxito e imprimir boleta
  private showPaymentSuccess(): void {
    this.paymentSuccess = true;
    this.selectedMethod = null;
    this.transbankService.stopStatusPolling();
    
    // Generar número de orden
    this.orderNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    // Imprimir boleta automáticamente
    this.printTransactionReceipt();
    
    // Limpiar el carrito inmediatamente
    this.cartService.clearCart();
  }
  
  // Imprimir boleta de pago con tarjeta
  private printTransactionReceipt(): void {
    console.log('🖨️ Imprimiendo boleta de transacción...');
    
    const items = this.cartService.getCurrentCartItems();
    const productos: ProductoTicket[] = items.map(item => ({
      nombre: item.product.name,
      cantidad: item.quantity,
      precio: item.product.price
    }));
    
    const transaccion: TransaccionTicket = {
      codigoAutorizacion: this.lastPaymentResponse?.authorizationCode || '',
      ultimosDigitos: this.lastPaymentResponse?.last4Digits?.toString() || '',
      tipoTarjeta: this.lastPaymentResponse?.cardType === 'DB' ? 'DEBITO' : 'CREDITO',
      monto: this.lastPaymentResponse?.amount || this.cartTotal,
      operacionId: this.lastPaymentResponse?.operationId || '',
      fecha: this.lastPaymentResponse?.realDate || '',
      hora: this.lastPaymentResponse?.realTime || ''
    };
    
    this.printerService.imprimirTicket(productos, undefined, this.orderNumber, transaccion).subscribe({
      next: (response) => {
        this.receiptPrinted = response.resultado === 'ok';
        console.log('🖨️ Boleta:', response.resultado);
      },
      error: (error) => {
        console.error('Error al imprimir boleta:', error);
        this.receiptPrinted = false;
      }
    });
  }
  
  // Volver al catálogo principal
  goHome(): void {
    this.cartService.clearCart();
    this.router.navigate(['/home']);
  }
  
  // Obtener tipo de tarjeta legible
  getCardTypeLabel(): string {
    if (!this.lastPaymentResponse?.cardType) return 'Tarjeta';
    return this.lastPaymentResponse.cardType === 'DB' ? 'Tarjeta de Débito' : 'Tarjeta de Crédito';
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
