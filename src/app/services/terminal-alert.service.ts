import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CLIENT_CONFIG } from '../../config/client.config';

/**
 * Notifica al backend que este totem necesita atención humana.
 * El admin verá la alerta en /admin/terminals.
 *
 * El terminal_code se toma del CLIENT_CONFIG, igual que el catalogue_code.
 * En la práctica, ambos coinciden con los env vars del transbank-pos-service
 * (TERMINAL_CODE / CATALOGUE_CODE).
 */
@Injectable({ providedIn: 'root' })
export class TerminalAlertService {
  // El totem no tiene TERMINAL_CODE en su client.config (solo lo usa el servicio Node).
  // Si llegara a estar definido en config, se prefiere; sino fallback a 'TOTEM-01'.
  private readonly terminalCode = (CLIENT_CONFIG as any).terminalCode || 'TOTEM-01';
  private readonly catalogueCode = CLIENT_CONFIG.catalogueCode;
  private readonly url = `${CLIENT_CONFIG.apiBase}/terminal/alert/`;

  constructor(private http: HttpClient) {}

  /**
   * Solicita atención del personal. Idempotente del lado del backend.
   */
  raise(message: string): Promise<any> {
    return firstValueFrom(
      this.http.post(this.url, {
        catalogue_code: this.catalogueCode,
        code: this.terminalCode,
        message,
      }),
    );
  }
}
