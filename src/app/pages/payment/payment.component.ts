import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CartService } from '../../services/cart.service';
import { CatalogueService } from '../../services/catalogue.service';
import { CartItem } from '../../models/products.model';
import { PrinterService, ProductoTicket } from '../../services/printer.service';
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

  get storeLogo(): string {
    return this.catalogueService.getClientConfiguration()?.logo_url ||
           this.catalogueService.getClientConfiguration()?.logo ||
           '';
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

    if (this.bypassPaxForTesting) {
      this.runSimulatedPayment();
      return;
    }

    this.runTransbankPayment();
  }

  cancelCardPayment(): void {
    this.clearPaymentTimers();

    if (!this.bypassPaxForTesting) {
      this.transbankService.cancelar().subscribe({
        next: () => { /* el servicio reconectará por sí mismo */ },
        error: err => console.error('[Transbank] Error al cancelar:', err)
      });
    }

    this.processingPayment = false;
    this.router.navigate(['/checkout']);
  }

  private runSimulatedPayment(): void {
    this.paymentStatusMessage = 'Modo prueba: omitiendo espera de confirmacion PAX...';

    this.statusTimeout = setTimeout(() => {
      this.paymentStatusMessage = 'Modo prueba: generando voucher de inmediato...';
    }, 2500);

    this.cardPaymentTimeout = setTimeout(() => {
      this.completeOrder();
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

        if (response.success && response.state !== 'RECHAZADO' && response.state !== 'ERROR') {
          this.paymentStatusMessage = '¡Pago aprobado!';
          this.completeOrder(response);
        } else {
          this.handleFailedPayment(response.state, response.message || response.responseMessage || 'Pago rechazado');
        }
      },
      error: err => {
        this.stopStatusPolling();
        if (this.destroyed) {
          return;
        }
        console.error('[Transbank] Error en /pagar:', err);
        const errMsg = err?.error?.message || err?.message || 'No se pudo conectar con el terminal Transbank';
        this.handleFailedPayment('ERROR', errMsg);
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
          // No sobreescribir el mensaje final si /pagar ya respondió
          if (!this.processingPayment) {
            return;
          }
          this.paymentStatusMessage = estado.message || this.paymentStatusMessage;
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

  private handleFailedPayment(state: TransbankState, message: string): void {
    this.paymentStatusMessage = message;

    // Dejar el mensaje visible un momento y volver al checkout para que el cliente reintente.
    this.statusTimeout = setTimeout(() => {
      this.processingPayment = false;
      this.router.navigate(['/checkout'], {
        queryParams: { paymentError: state }
      });
    }, 3500);
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
    this.processingPayment = false;

    const currency = this.catalogueService.getCurrency();
    const payload = this.orderService.buildPayload(this.cartItems, this.cartTotal, currency, tx);

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

    this.sendVoucherToPrinter(orderNumber, tx);

    localStorage.setItem(this.REFRESH_AFTER_PURCHASE_FLAG, '1');
    this.catalogueService.refreshCatalogue()
      .then(() => {
        localStorage.removeItem(this.REFRESH_AFTER_PURCHASE_FLAG);
      })
      .catch(() => {
        // Si falla, dejamos la flag para reintentar en Home
      });

    // Reintentar en background cualquier orden que haya quedado en cola
    this.orderService.retryPending().catch(() => { /* noop */ });

    setTimeout(() => {
      this.cartService.clearCart();
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

  private sendVoucherToPrinter(orderNumber: string, tx?: TransbankPagoResponse): void {
    if (!CLIENT_CONFIG.features.printReceipts) {
      return;
    }

    const productos: ProductoTicket[] = this.cartItems.map(item => ({
      nombre: item.product.name,
      cantidad: item.quantity,
      precio: item.product.price
    }));

    // El servicio de impresión actual sólo recibe productos + numeroPedido.
    // Cuando el plugin Python soporte transactionInfo (ver PROJECT_CONTEXT.md §4.3),
    // pasar tx aquí: codigo de autorización, últimos 4 dígitos, marca, etc.
    void tx;

    this.printerService.imprimirTicket(productos, undefined, orderNumber).subscribe({
      next: response => {
        if (response.resultado === 'ok') {
          console.log(`[Printer] Voucher enviado correctamente. Pedido #${orderNumber}`);
          return;
        }
        console.error(`[Printer] El servicio respondió con error al imprimir pedido #${orderNumber}:`, response.mensaje);
      },
      error: error => {
        console.error(`[Printer] Falló el envío del voucher para pedido #${orderNumber}:`, error);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.clearPaymentTimers();
    this.stopStatusPolling();
  }
}
