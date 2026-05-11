import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CartService } from '../../services/cart.service';
import { CatalogueService } from '../../services/catalogue.service';
import { CartItem } from '../../models/products.model';
import { PrinterService, ProductoTicket, TransactionInfo } from '../../services/printer.service';
import { TransbankPagoResponse, TransbankService, TransbankState } from '../../services/transbank.service';
import { OrderService } from '../../services/order.service';
import { CLIENT_CONFIG } from '../../../config/client.config';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.scss'
})
export class PaymentComponent implements OnInit, OnDestroy {
  private readonly REFRESH_AFTER_PURCHASE_FLAG = 'totem_refresh_after_purchase';
  private readonly bypassPaxForTesting = CLIENT_CONFIG.features.bypassPaxForTesting === true;

  processingPayment = true;
  orderNumber = '';
  cartTotal = 0;
  cartItems: CartItem[] = [];
  totalItems = 0;
  paymentStatusMessage = 'Conectando con terminal Transbank (PAX)...';

  private cardPaymentTimeout: ReturnType<typeof setTimeout> | null = null;
  private statusTimeout: ReturnType<typeof setTimeout> | null = null;
  private statusPollSub: Subscription | null = null;
  private lastTransaction: TransbankPagoResponse | null = null;
  private destroyed = false;

  // Estado visual derivado para el template (clases CSS + título grande)
  visualState: 'idle' | 'waiting' | 'processing' | 'cancelling' | 'cancelled' | 'approved' | 'error' = 'waiting';

  get storeLogo(): string {
    return this.catalogueService.getClientConfiguration()?.logo_url ||
           this.catalogueService.getClientConfiguration()?.logo ||
           '';
  }

  get stateClass(): 'idle' | 'waiting' | 'processing' | 'cancelling' | 'cancelled' | 'approved' | 'error' {
    return this.visualState;
  }

  get stateTitle(): string {
    switch (this.visualState) {
      case 'waiting':    return 'Acerca tu tarjeta';
      case 'processing': return 'Procesando pago';
      case 'cancelling': return 'Cancelando...';
      case 'cancelled':  return 'Pago cancelado';
      case 'approved':   return '¡Pago aprobado!';
      case 'error':      return 'No se pudo procesar';
      default:           return 'Pago con tarjeta';
    }
  }

  constructor(
    private router: Router,
    private cartService: CartService,
    private catalogueService: CatalogueService,
    private printerService: PrinterService,
    private transbankService: TransbankService,
    private orderService: OrderService
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

  goBack(): void {
    this.clearPaymentTimers();
    this.router.navigate(['/checkout']);
  }

  formatPrice(price: number): string {
    return '$' + price.toLocaleString('es-CL');
  }

  startCardPayment(): void {
    this.processingPayment = true;
    this.visualState = 'waiting';

    if (this.bypassPaxForTesting) {
      this.runSimulatedPayment();
      return;
    }

    this.runTransbankPayment();
  }

  cancelCardPayment(): void {
    // Si ya estamos en cualquier estado terminal (cancelled / error / approved),
    // este botón = "VOLVER AL CARRITO".
    if (this.visualState === 'cancelled' || this.visualState === 'error' || this.visualState === 'approved') {
      this.processingPayment = false;
      this.clearPaymentTimers();
      this.stopStatusPolling();
      this.router.navigate(['/checkout']);
      return;
    }

    // Si estamos cancelando, doble-click → ignorar
    if (this.visualState === 'cancelling') {
      return;
    }

    // Modo simulado: salir directo
    if (this.bypassPaxForTesting) {
      this.clearPaymentTimers();
      this.stopStatusPolling();
      this.processingPayment = false;
      this.router.navigate(['/checkout']);
      return;
    }

    // POS real con transacción en vuelo: pedir cancelación al servicio y QUEDARSE
    // en pantalla mientras esperamos confirmación.
    this.clearPaymentTimers();
    this.stopStatusPolling();
    this.visualState = 'cancelling';
    this.paymentStatusMessage =
      'Si el POS sigue pidiendo tarjeta, presiona el botón ROJO del POS para cancelar de inmediato.';

    this.transbankService.cancelar().subscribe({
      next: () => {
        // El servicio desconectó el POS — la promesa de pagar() debería rechazar
        // en unos segundos, lo cual nos lleva al estado 'cancelled' por la rama
        // de error de runTransbankPayment.
      },
      error: err => {
        console.error('[Transbank] Error al cancelar:', err);
        this.markCancelled('No se pudo confirmar la cancelación con el servicio.');
      }
    });

    // Safety net: si el POS no rechaza la promesa en 8 s, mostrar igual los botones
    this.statusTimeout = setTimeout(() => {
      if (!this.destroyed && this.visualState === 'cancelling') {
        this.markCancelled('Cancelación enviada. El POS terminará por sí solo.');
      }
    }, 8000);
  }

  /**
   * Marca el estado como "cancelado" (terminal) y muestra los botones
   * REINTENTAR / VOLVER AL CARRITO.
   */
  private markCancelled(message: string): void {
    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
      this.statusTimeout = null;
    }
    this.visualState = 'cancelled';
    this.paymentStatusMessage = message;
  }

  /**
   * Reintenta la venta tras un error recuperable (lectura de tarjeta fallida,
   * timeout, cancelación). Usa un ticket nuevo para evitar colisiones en el POS.
   */
  retryCardPayment(): void {
    this.clearPaymentTimers();
    this.stopStatusPolling();
    this.lastTransaction = null;
    this.startCardPayment();
  }

  private runSimulatedPayment(): void {
    this.paymentStatusMessage = 'Modo prueba: omitiendo espera de confirmacion PAX...';

    this.statusTimeout = setTimeout(() => {
      this.paymentStatusMessage = 'Modo prueba: generando voucher de inmediato...';
    }, 2500);

    this.cardPaymentTimeout = setTimeout(() => {
      this.visualState = 'approved';
      this.paymentStatusMessage = 'Modo prueba: pago aprobado (no se persiste).';
      // En modo simulado NO guardamos la orden en backend para no ensuciar
      // la lista de ventas reales.
      this.processingPayment = false;
      this.orderNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      setTimeout(() => {
        this.cartService.clearCart();
        this.router.navigate(['/home']);
      }, 1500);
    }, 3000);
  }

  private runTransbankPayment(): void {
    if (this.cartTotal <= 0) {
      console.warn('[Transbank] Monto inválido, redirigiendo a checkout');
      this.router.navigate(['/checkout']);
      return;
    }

    this.paymentStatusMessage = 'Conectando con terminal Transbank (PAX)...';

    const ticket = `TKT-${Date.now()}`;

    // Polling de estado en paralelo para reflejar el mensaje intermedio del POS
    // (ESPERANDO_TARJETA / PROCESANDO) mientras la llamada a /pagar sigue abierta.
    this.startStatusPolling();

    this.transbankService.pagar(this.cartTotal, ticket).subscribe({
      next: response => {
        this.stopStatusPolling();
        if (this.destroyed) {
          return;
        }
        this.lastTransaction = response;

        // Si el usuario pidió cancelar mientras el POS estaba procesando,
        // tratamos cualquier respuesta tardía como cancelación.
        if (this.visualState === 'cancelling') {
          this.markCancelled('Pago cancelado.');
          return;
        }

        if (response.success && response.state !== 'RECHAZADO' && response.state !== 'ERROR') {
          this.visualState = 'approved';
          this.paymentStatusMessage = '¡Pago aprobado!';
          this.completeOrder(response);
        } else {
          this.handleFailedPayment(
            response.state,
            response.message || response.responseMessage || 'Pago rechazado',
            response,
          );
        }
      },
      error: err => {
        this.stopStatusPolling();
        if (this.destroyed) {
          return;
        }

        // Si fue cancelación del usuario, llegamos acá porque el disconnect del
        // servicio hizo rechazar la promesa de sale(). No es un error real.
        if (this.visualState === 'cancelling') {
          this.markCancelled('Pago cancelado.');
          return;
        }

        console.error('[Transbank] Error en /pagar:', err);
        const errMsg = err?.error?.message || err?.message || 'No se pudo conectar con el terminal Transbank';
        this.handleFailedPayment('ERROR', errMsg, null);
      }
    });
  }

  private startStatusPolling(): void {
    this.stopStatusPolling();
    this.statusPollSub = interval(1500)
      .pipe(switchMap(() => this.transbankService.estado()))
      .subscribe({
        next: estado => {
          if (this.destroyed) {
            return;
          }
          if (!this.processingPayment) {
            return;
          }
          this.paymentStatusMessage = estado.message || this.paymentStatusMessage;

          // Mapear el estado del POS al estado visual de la UI
          switch (estado.state) {
            case 'ESPERANDO_TARJETA':
            case 'INICIANDO_PAGO':
              this.visualState = 'waiting';
              break;
            case 'PROCESANDO':
              this.visualState = 'processing';
              break;
            case 'APROBADO':
              this.visualState = 'approved';
              break;
            case 'RECHAZADO':
            case 'ERROR':
              this.visualState = 'error';
              break;
          }
        },
        error: () => { /* polling tolerante a fallos */ }
      });
  }

  private stopStatusPolling(): void {
    if (this.statusPollSub) {
      this.statusPollSub.unsubscribe();
      this.statusPollSub = null;
    }
  }

  private handleFailedPayment(state: TransbankState, message: string, tx: TransbankPagoResponse | null): void {
    this.visualState = 'error';
    this.paymentStatusMessage = message || 'No se pudo procesar el pago. Intenta nuevamente.';
    // No auto-redirigimos: el usuario decide entre Reintentar o Cancelar.
    // processingPayment se mantiene en true para seguir mostrando el card de proceso.

    // Persistir el intento fallido en background para que quede registro de qué falla.
    // 'rejected' = el POS contestó pero rechazó (ej. error lectura tarjeta, sin saldo).
    // 'failed'   = error técnico (POS desconectado, timeout, etc).
    const attemptStatus: 'rejected' | 'failed' = state === 'RECHAZADO' ? 'rejected' : 'failed';
    const currency = this.catalogueService.getCurrency();
    const payload = this.orderService.buildPayload(this.cartItems, this.cartTotal, currency, tx, {
      status: attemptStatus,
      notes: message,
    });
    this.orderService.createOrQueue(payload).catch(err => {
      console.warn('[Order] No se pudo persistir el intento fallido:', err);
    });
  }

  /**
   * Completa el pedido tras un pago aprobado (real o simulado).
   * Persiste la orden en backend antes de imprimir el voucher para que el
   * `local_order_number` sea el oficial. Si la red falla, encola y sigue.
   *
   * @param tx Datos de la transacción aprobada (opcional, sólo en modo real).
   */
  private async completeOrder(tx?: TransbankPagoResponse): Promise<void> {
    this.clearPaymentTimers();
    this.visualState = 'approved';

    const currency = this.catalogueService.getCurrency();
    const payload = this.orderService.buildPayload(this.cartItems, this.cartTotal, currency, tx, {
      status: 'approved',
    });

    let orderNumber: string;
    try {
      const order = await this.orderService.createOrQueue(payload);
      orderNumber = order?.local_order_number
        || payload.local_order_number
        || Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    } catch {
      orderNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    }
    this.orderNumber = orderNumber;
    this.paymentStatusMessage = `Pedido #${orderNumber} confirmado`;

    // Imprimir voucher en background (si está habilitado)
    if (CLIENT_CONFIG.features.printReceipts) {
      this.paymentStatusMessage = `Imprimiendo voucher · Pedido #${orderNumber}`;
    }
    this.sendVoucherToPrinter(orderNumber, tx);

    localStorage.setItem(this.REFRESH_AFTER_PURCHASE_FLAG, '1');
    this.catalogueService.refreshCatalogue()
      .then(() => {
        localStorage.removeItem(this.REFRESH_AFTER_PURCHASE_FLAG);
      })
      .catch(() => { /* flag queda para reintento en Home */ });

    this.orderService.retryPending().catch(() => { /* noop */ });

    // Mantener la pantalla de "Aprobado" 2.5s para que el cliente vea la confirmación.
    this.statusTimeout = setTimeout(() => {
      this.processingPayment = false;
      this.cartService.clearCart();
      this.router.navigate(['/home']);
    }, 2500);
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

  private sendVoucherToPrinter(orderNumber: string, tx?: TransbankPagoResponse): void {
    if (!CLIENT_CONFIG.features.printReceipts) {
      console.log(`[Printer] Impresión deshabilitada (printReceipts=false). Pedido #${orderNumber} NO se enviará.`);
      return;
    }

    const productos: ProductoTicket[] = this.cartItems.map(item => ({
      nombre: item.product.name,
      cantidad: item.quantity,
      precio: item.product.price
    }));

    const transactionInfo: TransactionInfo | undefined = tx ? {
      authorizationCode: tx.authorizationCode,
      operationNumber: tx.operationId,
      terminalId: tx.terminalId,
      commerceCode: tx.commerceCode,
      cardBrand: tx.cardBrand,
      cardType: tx.cardType,
      last4Digits: tx.last4Digits,
      realDate: tx.realDate,
      realTime: tx.realTime,
      ticket: tx.ticket,
    } : undefined;

    console.log(`[Printer] Enviando voucher pedido #${orderNumber} a ${productos.length} líneas...`);
    this.printerService.imprimirTicket(productos, undefined, orderNumber, transactionInfo).subscribe({
      next: response => {
        if (response.resultado === 'ok') {
          console.log(`[Printer] ✅ Voucher impreso. Pedido #${orderNumber}`);
          return;
        }
        console.error(`[Printer] ❌ El plugin respondió con error al imprimir pedido #${orderNumber}:`, response.mensaje);
      },
      error: error => {
        console.error(`[Printer] ❌ Falló el envío del voucher para pedido #${orderNumber}:`, error);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.clearPaymentTimers();
    this.stopStatusPolling();
  }
}
