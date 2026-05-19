import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CartItem } from '../models/products.model';
import { TransactionInfo } from './printer.service';

export type PrinterStatus = 'pending' | 'ok' | 'error' | 'disabled';

export interface LocalSale {
  id: string;                   // uuid simple
  orderNumber: string;
  total: number;
  currency: string;
  itemsCount: number;
  items: Array<{ name: string; quantity: number; price: number }>;
  transaction?: TransactionInfo | null;
  printerStatus: PrinterStatus;
  printerMessage?: string;
  createdAt: string;            // ISO string
  printedAt?: string;
}

const STORAGE_KEY = 'totem_local_sales_v1';
const MAX_SALES = 50;

@Injectable({ providedIn: 'root' })
export class LocalSalesService {
  private salesSubject = new BehaviorSubject<LocalSale[]>(this.read());

  /** Observable de las últimas ventas locales, más reciente primero. */
  getSales$(): Observable<LocalSale[]> {
    return this.salesSubject.asObservable();
  }

  /** Snapshot sincrónico. */
  getSales(): LocalSale[] {
    return this.salesSubject.value;
  }

  /**
   * Registra una venta nueva. La impresión arranca en 'pending' por defecto
   * y se actualiza vía markPrinted/markPrintError.
   */
  recordSale(input: {
    orderNumber: string;
    total: number;
    currency: string;
    items: CartItem[];
    transaction?: TransactionInfo | null;
    printerStatus?: PrinterStatus;
  }): LocalSale {
    const sale: LocalSale = {
      id: this.generateId(),
      orderNumber: input.orderNumber,
      total: input.total,
      currency: input.currency,
      itemsCount: input.items.reduce((acc, it) => acc + it.quantity, 0),
      items: input.items.map((it) => ({
        name: it.product.name,
        quantity: it.quantity,
        price: it.product.price,
      })),
      transaction: input.transaction || null,
      printerStatus: input.printerStatus || 'pending',
      createdAt: new Date().toISOString(),
    };

    const next = [sale, ...this.salesSubject.value].slice(0, MAX_SALES);
    this.persist(next);
    return sale;
  }

  markPrinted(saleId: string): void {
    this.update(saleId, {
      printerStatus: 'ok',
      printerMessage: undefined,
      printedAt: new Date().toISOString(),
    });
  }

  markPrintError(saleId: string, message?: string): void {
    this.update(saleId, { printerStatus: 'error', printerMessage: message });
  }

  markPrintDisabled(saleId: string): void {
    this.update(saleId, { printerStatus: 'disabled' });
  }

  private update(saleId: string, patch: Partial<LocalSale>): void {
    const next = this.salesSubject.value.map((s) => (s.id === saleId ? { ...s, ...patch } : s));
    this.persist(next);
  }

  private read(): LocalSale[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private persist(sales: LocalSale[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
    } catch {
      // ignore quota errors silently
    }
    this.salesSubject.next(sales);
  }

  private generateId(): string {
    return `sale_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  }
}
