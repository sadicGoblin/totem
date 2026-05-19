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
import { LocalSalesService, LocalSale, PrinterStatus } from '../../services/local-sales.service';
import { TerminalAlertService } from '../../services/terminal-alert.service';
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
  visualState: 'idle' | 'waiting' | 'processing' | 'cancelling' | 'cancelled' | 'approved' | 'error' | 'reconnecting' = 'waiting';

  // Estado de impresión visible en pantalla de aprobado
  printerStatus: PrinterStatus = 'pending';
  printerMessage = '';
  reprintInFlight = false;
  // Solicitud de atención al admin (cuando falla la impresión y el cliente lo pide)
  attentionRequested = false;
  attentionInFlight = false;
  private currentSale: LocalSale | null = null;

  get humanPrinterMessage(): string {
    return this.humanizePrinterError(this.printerMessage);
  }

  get storeLogo(): string {
    return this.catalogueService.getClientConfiguration()?.logo_url ||
           this.catalogueService.getClientConfiguration()?.logo ||
           '';
  }

  get stateClass(): 'idle' | 'waiting' | 'processing' | 'cancelling' | 'cancelled' | 'approved' | 'error' | 'reconnecting' {
    return this.visualState;
  }

  get stateTitle(): string {
    switch (this.visualState) {
      case 'waiting':     return 'Acerca tu tarjeta';
      case 'processing':  return 'Procesando pago';
      case 'cancelling':  return 'Cancelando...';
      case 'cancelled':   return 'Pago cancelado';
      case 'approved':    return '¡Pago aprobado!';
      case 'error':       return 'No se pudo procesar';
      case 'reconnecting':return 'Reconectando con POS...';
      default:            return 'Pago con tarjeta';
    }
  }

  constructor(
    private router: Router,
    private cartService: CartService,
    private catalogueService: CatalogueService,
    private printerService: PrinterService,
    private transbankService: TransbankService,
    private orderService: OrderService,
    private localSales: LocalSalesService,
    private terminalAlert: TerminalAlertService,
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
   * Reintenta la venta tras un error recuperable.
   *
   * Antes de iniciar un nuevo /pagar, **cancela la transacción anterior del POS
   * y espera a que vuelva al estado IDLE**. Sin esto, si el POS sigue
   * esperando tarjeta o clave de la transacción previa, el nuevo /pagar
   * devuelve "ACK has not been received in 2000 ms" + 500.
   */
  async retryCardPayment(): Promise<void> {
    this.clearPaymentTimers();
    this.stopStatusPolling();
    this.lastTransaction = null;

    // Modo simulado: no hay POS real, simplemente reiniciar.
    if (this.bypassPaxForTesting) {
      this.startCardPayment();
      return;
    }

    this.visualState = 'reconnecting';
    this.paymentStatusMessage = 'Cancelando transacción anterior en el POS...';

    try {
      await this.cancelAnyInFlightTransaction();
    } catch (err) {
      console.error('[Transbank] retry/cancelar falló:', err);
      // Aunque la cancelación falle, igual intentamos esperar IDLE.
    }

    this.paymentStatusMessage = 'Verificando estado del terminal...';
    const ok = await this.waitForPosIdle(8);

    if (this.destroyed) return;

    if (!ok) {
      this.visualState = 'error';
      this.paymentStatusMessage =
        'El terminal POS sigue ocupado. Presiona el botón ROJO del POS para liberarlo y reintenta.';
      return;
    }

    // POS libre → iniciar pago nuevo
    this.startCardPayment();
  }

  /** Pide al servicio cancelar la transacción del POS (si hubiera). */
  private cancelAnyInFlightTransaction(): Promise<void> {
    return new Promise((resolve) => {
      this.transbankService.cancelar().subscribe({
        next: () => resolve(),
        error: () => resolve(), // si no había qué cancelar, igual seguimos
      });
    });
  }

  /**
   * Hace polling al endpoint /estado del POS hasta que reporte IDLE o se agoten
   * los intentos. Retorna true si quedó IDLE, false en otro caso.
   */
  private waitForPosIdle(maxAttempts: number): Promise<boolean> {
    return new Promise((resolve) => {
      let attempts = 0;

      const tick = () => {
        if (this.destroyed) {
          resolve(false);
          return;
        }
        attempts++;
        this.transbankService.estado().subscribe({
          next: (estado) => {
            if (this.destroyed) {
              resolve(false);
              return;
            }
            const idle = estado.state === 'IDLE' || !estado.isTransactionInProgress;
            if (idle) {
              resolve(true);
            } else if (attempts >= maxAttempts) {
              resolve(false);
            } else {
              this.paymentStatusMessage = `Esperando que el POS termine (${estado.message || estado.state})...`;
              setTimeout(tick, 1000);
            }
          },
          error: () => {
            if (attempts >= maxAttempts) {
              resolve(false);
            } else {
              setTimeout(tick, 1200);
            }
          },
        });
      };

      tick();
    });
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
        this.router.navigate(['/welcome']);
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

        // Defensa en profundidad: el POS puede haber recibido la solicitud y
        // seguir en vuelo (esperando tarjeta/clave) aunque el servicio Node
        // haya respondido error/timeout. Enviamos cancelación silenciosa para
        // que no quede pegado. Si no había transacción, el POS la ignora.
        this.transbankService.cancelar().subscribe({
          next: () => console.log('[Transbank] Cancelación preventiva enviada tras error /pagar'),
          error: () => { /* noop: best effort */ },
        });

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
    this.paymentStatusMessage = this.humanizePosError(message);
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

    // Registrar venta local para consulta posterior desde el menú escondido.
    const printerEnabled = CLIENT_CONFIG.features.printReceipts;
    this.currentSale = this.localSales.recordSale({
      orderNumber,
      total: this.cartTotal,
      currency,
      items: this.cartItems,
      transaction: tx ? this.buildTransactionInfo(tx) : null,
      printerStatus: printerEnabled ? 'pending' : 'disabled',
    });
    this.printerStatus = this.currentSale.printerStatus;

    // Imprimir voucher en background (si está habilitado)
    if (printerEnabled) {
      this.paymentStatusMessage = `Imprimiendo voucher · Pedido #${orderNumber}`;
      this.sendVoucherToPrinter(orderNumber, tx);
    }

    localStorage.setItem(this.REFRESH_AFTER_PURCHASE_FLAG, '1');
    this.catalogueService.refreshCatalogue()
      .then(() => {
        localStorage.removeItem(this.REFRESH_AFTER_PURCHASE_FLAG);
      })
      .catch(() => { /* flag queda para reintento en Home */ });

    this.orderService.retryPending().catch(() => { /* noop */ });

    // El cliente decide cuándo volver (botones "Ir al inicio" / "Comprar otra vez").
    // El carrito se limpia al confirmar la salida.
  }

  goHome(): void {
    this.clearPaymentTimers();
    this.stopStatusPolling();
    this.processingPayment = false;
    this.cartService.clearCart();
    this.router.navigate(['/welcome']);
  }

  buyAgain(): void {
    this.clearPaymentTimers();
    this.stopStatusPolling();
    this.processingPayment = false;
    this.cartService.clearCart();
    this.router.navigate(['/catalogue']);
  }

  retryPrint(): void {
    if (!this.currentSale || this.reprintInFlight) return;
    if (!CLIENT_CONFIG.features.printReceipts) return;

    this.reprintInFlight = true;
    this.printerStatus = 'pending';
    this.printerMessage = '';
    // Si el reintento funciona, el cliente quizás ya no necesita asistencia.
    this.attentionRequested = false;

    const productos: ProductoTicket[] = this.currentSale.items.map((it) => ({
      nombre: it.name,
      cantidad: it.quantity,
      precio: it.price,
    }));

    this.printerService.imprimirTicket(
      productos,
      undefined,
      this.currentSale.orderNumber,
      this.currentSale.transaction || undefined,
    ).subscribe({
      next: (response) => {
        this.reprintInFlight = false;
        if (response.resultado === 'ok') {
          this.printerStatus = 'ok';
          this.localSales.markPrinted(this.currentSale!.id);
        } else {
          this.printerStatus = 'error';
          this.printerMessage = response.mensaje || 'La impresora respondió con error';
          this.localSales.markPrintError(this.currentSale!.id, response.mensaje);
        }
      },
      error: (err) => {
        this.reprintInFlight = false;
        this.printerStatus = 'error';
        this.printerMessage = err?.error?.mensaje || err?.message || 'No se pudo conectar a la impresora';
        this.localSales.markPrintError(this.currentSale!.id, this.printerMessage);
      },
    });
  }

  async requestAttention(): Promise<void> {
    if (this.attentionInFlight || this.attentionRequested) return;
    this.attentionInFlight = true;
    const orderNumber = this.currentSale?.orderNumber || this.orderNumber || '—';
    const message =
      `Pedido #${orderNumber} pagado pero el voucher no se imprimió. ` +
      `Motivo técnico: ${this.printerMessage || 'sin detalle'}.`;
    try {
      await this.terminalAlert.raise(message);
      this.attentionRequested = true;
    } catch (err) {
      console.error('[Payment] No se pudo enviar la alerta:', err);
      // Intento de reintento posible — el botón vuelve a quedar disponible
      this.attentionRequested = false;
    } finally {
      this.attentionInFlight = false;
    }
  }

  private buildTransactionInfo(tx: TransbankPagoResponse): TransactionInfo {
    return {
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
    };
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
      this.printerStatus = 'disabled';
      if (this.currentSale) this.localSales.markPrintDisabled(this.currentSale.id);
      return;
    }

    const productos: ProductoTicket[] = this.cartItems.map(item => ({
      nombre: item.product.name,
      cantidad: item.quantity,
      precio: item.product.price
    }));

    const transactionInfo: TransactionInfo | undefined = tx ? this.buildTransactionInfo(tx) : undefined;

    console.log(`[Printer] Enviando voucher pedido #${orderNumber} a ${productos.length} líneas...`);
    this.printerStatus = 'pending';
    this.printerService.imprimirTicket(productos, undefined, orderNumber, transactionInfo).subscribe({
      next: response => {
        if (response.resultado === 'ok') {
          console.log(`[Printer] ✅ Voucher impreso. Pedido #${orderNumber}`);
          this.printerStatus = 'ok';
          if (this.currentSale) this.localSales.markPrinted(this.currentSale.id);
          return;
        }
        console.error(`[Printer] ❌ El plugin respondió con error al imprimir pedido #${orderNumber}:`, response.mensaje);
        this.printerStatus = 'error';
        this.printerMessage = response.mensaje || 'La impresora respondió con error';
        if (this.currentSale) this.localSales.markPrintError(this.currentSale.id, response.mensaje);
      },
      error: error => {
        console.error(`[Printer] ❌ Falló el envío del voucher para pedido #${orderNumber}:`, error);
        this.printerStatus = 'error';
        this.printerMessage = error?.error?.mensaje || error?.message || 'No se pudo conectar a la impresora';
        if (this.currentSale) this.localSales.markPrintError(this.currentSale.id, this.printerMessage);
      }
    });
  }

  /**
   * Convierte errores técnicos de la impresora en mensajes amistosos.
   * El cliente está parado frente al totem; no debería leer URLs ni stack traces.
   */
  private humanizePrinterError(raw: string): string {
    if (!raw) return 'No se pudo imprimir el voucher. Solicita ayuda al personal.';
    const m = String(raw).toLowerCase();

    if (m.includes('http failure') || m.includes('unknown error') || m.includes('0 unknown') ||
        m.includes('econn') || m.includes('refused') || m.includes('failed to fetch')) {
      return 'La impresora no respondió. Solicita ayuda al personal para retirar tu voucher.';
    }
    if (m.includes('timeout') || m.includes('time out')) {
      return 'La impresora tardó demasiado en responder. Solicita ayuda al personal.';
    }
    if (m.includes('papel') || m.includes('paper')) {
      return 'Sin papel en la impresora. Solicita ayuda al personal.';
    }
    if (m.includes('not found') || m.includes('404')) {
      return 'Servicio de impresión no disponible. Solicita ayuda al personal.';
    }
    if (m.includes('500') || m.includes('internal server')) {
      return 'La impresora reportó un error interno. Solicita ayuda al personal.';
    }
    // Fallback genérico SIN mostrar URLs ni códigos técnicos
    return 'No se pudo imprimir el voucher. Solicita ayuda al personal para que te lo entreguen.';
  }

  /**
   * Convierte errores técnicos del POS / servicio en mensajes amistosos
   * para el cliente que está mirando el totem.
   */
  private humanizePosError(raw: string): string {
    if (!raw) return 'No se pudo procesar el pago. Intenta nuevamente.';
    const m = String(raw).toLowerCase();

    if (m.includes('ack has not been received')) {
      return 'El terminal POS no respondió a tiempo. Vamos a intentarlo nuevamente.';
    }
    if (m.includes('internal server error') || m.includes('http failure') || m.includes('status: 500')) {
      return 'El terminal POS reportó un error interno. Reintenta el pago.';
    }
    if (m.includes('econn') || m.includes('network') || m.includes('failed to fetch')) {
      return 'Sin conexión con el servicio del POS. Verifica el cable y reintenta.';
    }
    if (m.includes('busy') || m.includes('in progress') || m.includes('en curso')) {
      return 'El POS tiene otra transacción en curso. Espera unos segundos o presiona ROJO en el POS.';
    }
    if (m.includes('cancel')) {
      return 'Pago cancelado en el POS.';
    }
    if (m.includes('tarjeta') || m.includes('card')) {
      return 'No se pudo leer la tarjeta. Inténtalo nuevamente.';
    }
    if (m.includes('saldo') || m.includes('rechaz')) {
      return 'Pago rechazado por el banco. Prueba con otra tarjeta.';
    }
    return raw; // fallback: mensaje original
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.clearPaymentTimers();
    this.stopStatusPolling();
  }
}
