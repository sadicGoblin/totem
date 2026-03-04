import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, Subscription, of } from 'rxjs';
import { catchError, switchMap, takeWhile } from 'rxjs/operators';

export interface PaymentRequest {
  monto: number;
  numeroTicket?: string;
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  state: TransactionState;
  authorizationCode?: string;
  cardLast4Digits?: string;
  cardType?: string;
  amount?: number;
  transactionId?: string;
  timestamp?: string;
  responseCode?: string;
}

export interface CancelResponse {
  success: boolean;
  message: string;
  state: TransactionState;
  failureReason?: string;
}

export interface StatusResponse {
  state: TransactionState;
  stateName: string;
  isTransactionInProgress: boolean;
  canCancel: boolean;
  currentAmount?: number;
  elapsedSeconds?: number;
  message: string;
  lastTransaction?: PaymentResponse;
}

export type TransactionState = 
  | 'IDLE' 
  | 'INICIANDO_PAGO' 
  | 'ESPERANDO_TARJETA' 
  | 'PROCESANDO' 
  | 'APROBADO' 
  | 'RECHAZADO' 
  | 'CANCELADO' 
  | 'ERROR';

@Injectable({
  providedIn: 'root'
})
export class TransbankService {
  private readonly baseUrl = 'http://localhost:7070/api/transbank';
  
  private currentState = new BehaviorSubject<TransactionState>('IDLE');
  private statusMessage = new BehaviorSubject<string>('');
  private pollingSubscription?: Subscription;
  
  public currentState$ = this.currentState.asObservable();
  public statusMessage$ = this.statusMessage.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Verifica si el servicio Transbank está disponible
   */
  healthCheck(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`).pipe(
      catchError(error => {
        console.error('❌ Servicio Transbank no disponible:', error);
        return of({ status: 'error', message: 'Servicio no disponible' });
      })
    );
  }

  /**
   * Inicia un pago con tarjeta
   */
  iniciarPago(monto: number, numeroTicket?: string): Observable<PaymentResponse> {
    console.log(`💳 Iniciando pago Transbank por $${monto.toLocaleString('es-CL')}`);
    
    const request: PaymentRequest = { monto, numeroTicket };
    
    // Iniciar polling de estado
    this.startStatusPolling();
    
    return this.http.post<PaymentResponse>(`${this.baseUrl}/pagar`, request).pipe(
      catchError(error => {
        console.error('❌ Error en pago Transbank:', error);
        this.stopStatusPolling();
        return of({
          success: false,
          message: 'Error de conexión con el servicio de pago',
          state: 'ERROR' as TransactionState
        });
      })
    );
  }

  /**
   * Cancela la transacción actual si es posible
   */
  cancelarPago(): Observable<CancelResponse> {
    console.log('🚫 Solicitando cancelación de pago...');
    
    return this.http.post<CancelResponse>(`${this.baseUrl}/cancelar`, {}).pipe(
      catchError(error => {
        console.error('❌ Error al cancelar:', error);
        return of({
          success: false,
          message: 'Error de conexión',
          state: 'ERROR' as TransactionState,
          failureReason: error.message
        });
      })
    );
  }

  /**
   * Obtiene el estado actual del POS
   */
  getEstado(): Observable<StatusResponse> {
    return this.http.get<StatusResponse>(`${this.baseUrl}/estado`).pipe(
      catchError(error => {
        return of({
          state: 'ERROR' as TransactionState,
          stateName: 'ERROR',
          isTransactionInProgress: false,
          canCancel: false,
          message: 'Sin conexión con el POS'
        });
      })
    );
  }

  /**
   * Inicia el polling de estado para actualizar la UI
   */
  private startStatusPolling(): void {
    this.stopStatusPolling();
    
    this.pollingSubscription = interval(1000).pipe(
      switchMap(() => this.getEstado()),
      takeWhile(status => status.isTransactionInProgress, true)
    ).subscribe({
      next: (status) => {
        this.currentState.next(status.state);
        this.statusMessage.next(status.message);
        console.log(`📡 Estado POS: ${status.state} - ${status.message}`);
      },
      complete: () => {
        console.log('✅ Polling de estado finalizado');
      }
    });
  }

  /**
   * Detiene el polling de estado
   */
  stopStatusPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
  }

  /**
   * Obtiene mensaje legible para el usuario según el estado
   */
  getMessageForState(state: TransactionState): string {
    switch (state) {
      case 'IDLE':
        return 'POS disponible';
      case 'INICIANDO_PAGO':
        return 'Conectando con el POS...';
      case 'ESPERANDO_TARJETA':
        return 'Por favor, inserte o acerque su tarjeta al POS';
      case 'PROCESANDO':
        return 'Procesando transacción, por favor espere...';
      case 'APROBADO':
        return '¡Pago aprobado!';
      case 'RECHAZADO':
        return 'Pago rechazado';
      case 'CANCELADO':
        return 'Pago cancelado';
      case 'ERROR':
        return 'Error en la transacción';
      default:
        return 'Estado desconocido';
    }
  }

  /**
   * Verifica si se puede cancelar en el estado actual
   */
  canCancelInState(state: TransactionState): boolean {
    return state === 'INICIANDO_PAGO' || state === 'PROCESANDO';
  }
}
