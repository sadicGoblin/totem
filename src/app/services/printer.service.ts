import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CLIENT_CONFIG } from '../../config/client.config';

export interface ProductoTicket {
  nombre: string;
  cantidad: number;
  precio: number;
}

/**
 * Información de la transacción Transbank a imprimir en el voucher.
 */
export interface TransactionInfo {
  authorizationCode?: string | null;
  operationNumber?: string | null;
  terminalId?: string | null;
  commerceCode?: string | null;
  cardBrand?: string | null;
  cardType?: string | null;
  last4Digits?: string | null;
  realDate?: string | null;
  realTime?: string | null;
  ticket?: string | null;
}

export interface DatosTicket {
  productos: ProductoTicket[];
  total?: number;
  nombreImpresora?: string;
  numeroPedido?: string;
  transactionInfo?: TransactionInfo;
}

export interface RespuestaImpresion {
  resultado: 'ok' | 'error';
  mensaje?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PrinterService {
  private readonly PRINTER_URL = CLIENT_CONFIG.printerBase || 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) {}

  /**
   * Envía los datos del pedido al plugin de impresión.
   * El plugin imprime un voucher principal con detalle + total + datos Transbank,
   * y luego un mini-ticket pre-picado por cada unidad del carrito.
   */
  imprimirTicket(
    productos: ProductoTicket[],
    nombreImpresora?: string,
    numeroPedido?: string,
    transactionInfo?: TransactionInfo,
  ): Observable<RespuestaImpresion> {
    const datosTicket: DatosTicket = {
      productos,
      nombreImpresora,
      numeroPedido,
      transactionInfo,
    };
    return this.http.post<RespuestaImpresion>(`${this.PRINTER_URL}/imprimir`, datosTicket);
  }

  verificarConexion(): Observable<any> {
    return this.http.get(`${this.PRINTER_URL}/status`).pipe();
  }
}
