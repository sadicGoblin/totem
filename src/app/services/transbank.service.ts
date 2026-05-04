import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CLIENT_CONFIG } from '../../config/client.config';

export type TransbankState =
  | 'IDLE'
  | 'INICIANDO_PAGO'
  | 'ESPERANDO_TARJETA'
  | 'PROCESANDO'
  | 'APROBADO'
  | 'RECHAZADO'
  | 'CANCELADO'
  | 'ERROR';

export interface TransbankHealthResponse {
  status: 'healthy';
  timestamp: string;
  connected: boolean;
  port: string | null;
}

export interface TransbankConectarResponse {
  success: boolean;
  message?: string;
  port?: string | null;
  keysLoaded?: boolean;
  error?: string;
}

export interface TransbankEstadoResponse {
  state: TransbankState;
  isTransactionInProgress: boolean;
  canCancel: boolean;
  connected: boolean;
  port: string | null;
  message: string;
  lastTransaction: TransbankPagoResponse | null;
  timestamp: string;
}

export interface TransbankPagoRequest {
  monto: number;
  numeroTicket?: string;
}

export interface TransbankPagoResponse {
  success: boolean;
  message?: string;
  state: TransbankState;
  amount?: number;
  authorizationCode: string | null;
  operationId: string | null;
  cardType: string | null;
  last4Digits: string | null;
  responseCode: string | number | null;
  responseMessage: string | null;
  commerceCode: string | null;
  terminalId: string | null;
  cardBrand: string | null;
  realDate: string | null;
  realTime: string | null;
  ticket: string | null;
  timestamp: string;
}

export interface TransbankCancelarResponse {
  success: boolean;
  message: string;
  previousState: TransbankState;
  state: TransbankState;
}

@Injectable({ providedIn: 'root' })
export class TransbankService {
  private readonly base = CLIENT_CONFIG.transbankBase;

  constructor(private http: HttpClient) {}

  health(): Observable<TransbankHealthResponse> {
    return this.http.get<TransbankHealthResponse>(`${this.base}/health`);
  }

  conectar(): Observable<TransbankConectarResponse> {
    return this.http.post<TransbankConectarResponse>(`${this.base}/conectar`, {});
  }

  inicializarTms(): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.base}/inicializar-tms`,
      {}
    );
  }

  estado(): Observable<TransbankEstadoResponse> {
    return this.http.get<TransbankEstadoResponse>(`${this.base}/estado`);
  }

  pagar(monto: number, numeroTicket?: string): Observable<TransbankPagoResponse> {
    const body: TransbankPagoRequest = { monto, numeroTicket };
    return this.http.post<TransbankPagoResponse>(`${this.base}/pagar`, body);
  }

  cancelar(): Observable<TransbankCancelarResponse> {
    return this.http.post<TransbankCancelarResponse>(`${this.base}/cancelar`, {});
  }

  cerrarDia(): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(`${this.base}/cerrar-dia`, {});
  }
}
