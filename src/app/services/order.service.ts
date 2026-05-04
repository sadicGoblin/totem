import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { CLIENT_CONFIG } from '../../config/client.config';
import { CartItem } from '../models/products.model';
import { TransbankPagoResponse } from './transbank.service';

export interface OrderItemPayload {
  product_id?: number | null;
  name: string;
  sku?: string | null;
  quantity: number;
  unit_price: number;
}

export interface OrderCreatePayload {
  catalogue_code: string;
  external_transaction_id: string;
  local_order_number?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'voided' | 'failed';
  currency: string;
  subtotal: number;
  total: number;

  authorization_code?: string | null;
  operation_number?: string | null;
  terminal_id?: string | null;
  commerce_code?: string | null;
  card_type?: string | null;
  card_brand?: string | null;
  last_4_digits?: string | null;
  accounting_date?: string | null;
  real_date?: string | null;
  real_time?: string | null;
  response_code?: string | number | null;
  response_message?: string | null;
  ticket?: string | null;

  raw_response?: unknown;
  notes?: string | null;

  items: OrderItemPayload[];
}

export interface OrderResponse extends OrderCreatePayload {
  id: number;
  catalogue: number;
  catalogue_code: string;
  catalogue_name: string;
  organization_name: string;
  created: string;
  modified: string;
  is_removed: boolean;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly endpoint = `${CLIENT_CONFIG.apiBase}/order/`;
  private readonly pendingKey = 'totem_pending_orders';

  constructor(private http: HttpClient) {}

  /**
   * Construye un payload listo para enviar al backend a partir del carrito y la
   * respuesta del POS Transbank. La parte importante es `external_transaction_id`,
   * que actúa como llave de idempotencia.
   */
  buildPayload(
    items: CartItem[],
    cartTotal: number,
    currency: string,
    tx?: TransbankPagoResponse | null,
    overrides?: { localOrderNumber?: string; notes?: string }
  ): OrderCreatePayload {
    const externalId = this.computeExternalTransactionId(tx, cartTotal);

    return {
      catalogue_code: CLIENT_CONFIG.catalogueCode,
      external_transaction_id: externalId,
      local_order_number: overrides?.localOrderNumber,
      status: tx?.success === false ? 'rejected' : 'approved',
      currency,
      subtotal: cartTotal,
      total: cartTotal,

      authorization_code: tx?.authorizationCode ?? null,
      operation_number: tx?.operationId ?? null,
      terminal_id: tx?.terminalId ?? null,
      commerce_code: tx?.commerceCode ?? null,
      card_type: tx?.cardType ?? null,
      card_brand: tx?.cardBrand ?? null,
      last_4_digits: tx?.last4Digits ?? null,
      accounting_date: tx?.realDate ?? null,
      real_date: tx?.realDate ?? null,
      real_time: tx?.realTime ?? null,
      response_code: tx?.responseCode ?? null,
      response_message: tx?.responseMessage ?? null,
      ticket: tx?.ticket ?? null,

      raw_response: tx ?? null,
      notes: overrides?.notes ?? null,

      items: items.map(item => ({
        product_id: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
      })),
    };
  }

  /**
   * El "código entregado por el POS" no es una sola pieza: usamos la tupla
   * `(terminalId, operationNumber, realDate)`. Si no llega ninguno (modo simulado),
   * caemos en un id local determinístico.
   */
  private computeExternalTransactionId(tx: TransbankPagoResponse | null | undefined, total: number): string {
    if (tx?.terminalId && tx?.operationId) {
      const parts = [tx.terminalId, tx.operationId, tx.realDate || tx.timestamp].filter(Boolean);
      return parts.join('-');
    }
    // Sin POS real (testing) → id determinístico para evitar duplicados si reintenta
    return `local-${Date.now()}-${Math.round(total)}`;
  }

  create(payload: OrderCreatePayload): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(this.endpoint, payload);
  }

  /**
   * Crea la orden y, si falla la red, la encola en localStorage para reintento.
   * Devuelve la respuesta del backend (con local_order_number generado en server)
   * o `null` si quedó en cola offline.
   */
  async createOrQueue(payload: OrderCreatePayload): Promise<OrderResponse | null> {
    try {
      return await firstValueFrom(this.create(payload));
    } catch (err) {
      console.warn('[Order] No se pudo crear la orden, queda en cola offline:', err);
      this.enqueue(payload);
      return null;
    }
  }

  /**
   * Reintenta enviar las órdenes pendientes en localStorage. La idempotencia del
   * backend (UNIQUE external_transaction_id) garantiza que reintentar es seguro.
   */
  async retryPending(): Promise<{ sent: number; failed: number }> {
    const pending = this.getPending();
    if (pending.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const remaining: OrderCreatePayload[] = [];
    let sent = 0;
    for (const payload of pending) {
      try {
        await firstValueFrom(this.create(payload));
        sent++;
      } catch (err) {
        console.warn('[Order] Reintento falló, queda en cola:', err);
        remaining.push(payload);
      }
    }
    this.savePending(remaining);
    return { sent, failed: remaining.length };
  }

  getPending(): OrderCreatePayload[] {
    try {
      const raw = localStorage.getItem(this.pendingKey);
      return raw ? (JSON.parse(raw) as OrderCreatePayload[]) : [];
    } catch {
      return [];
    }
  }

  private enqueue(payload: OrderCreatePayload): void {
    const pending = this.getPending();
    // Evitar duplicados por external_transaction_id en la cola local
    if (pending.some(p => p.external_transaction_id === payload.external_transaction_id)) {
      return;
    }
    pending.push(payload);
    this.savePending(pending);
  }

  private savePending(pending: OrderCreatePayload[]): void {
    try {
      localStorage.setItem(this.pendingKey, JSON.stringify(pending));
    } catch (err) {
      console.error('[Order] Error guardando cola offline:', err);
    }
  }
}
