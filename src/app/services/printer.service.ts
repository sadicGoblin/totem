import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProductoTicket {
  nombre: string;
  cantidad: number;
  precio: number;
}

export interface TransaccionTicket {
  codigoAutorizacion: string;
  ultimosDigitos: string;
  tipoTarjeta: string;
  monto: number;
  operacionId: string;
  fecha: string;
  hora: string;
}

export interface DatosTicket {
  productos: ProductoTicket[];
  total?: number;
  nombreImpresora?: string;
  numeroPedido?: string;
  transaccion?: TransaccionTicket;
}

export interface RespuestaImpresion {
  resultado: 'ok' | 'error';
  mensaje?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PrinterService {
  private readonly PRINTER_URL = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) {}

  /**
   * Envía los datos del pedido al plugin de impresión
   * @param productos Lista de productos del carrito
   * @param nombreImpresora Nombre de la impresora (opcional, usa la por defecto si no se especifica)
   * @param numeroPedido Número del pedido (opcional)
   * @returns Observable con la respuesta del servidor de impresión
   */
  imprimirTicket(productos: ProductoTicket[], nombreImpresora?: string, numeroPedido?: string, transaccion?: TransaccionTicket): Observable<RespuestaImpresion> {
    const datosTicket: DatosTicket = {
      productos: productos,
      nombreImpresora: nombreImpresora,
      numeroPedido: numeroPedido,
      transaccion: transaccion
    };

    return this.http.post<RespuestaImpresion>(`${this.PRINTER_URL}/imprimir`, datosTicket);
  }

  /**
   * Verifica si el servicio de impresión está disponible
   * @returns Observable<boolean>
   */
  verificarConexion(): Observable<any> {
    return this.http.get(`${this.PRINTER_URL}/status`).pipe();
  }
}
