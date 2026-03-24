// src/app/services/idle.service.ts
import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class IdleService {
  private timeout: any;
  private idleTime = 60000; // 1 minuto de inactividad
  private _paused = false; // Pausar durante procesos críticos (ej: pago Transbank)

  constructor(private router: Router, private ngZone: NgZone) {}

  startWatching() {
    this.resetTimer();

    ['mousemove', 'mousedown', 'keypress', 'touchstart'].forEach(evt => {
      window.addEventListener(evt, this.resetTimer.bind(this));
    });
  }

  /** Pausar el timer de inactividad (ej: durante pago con tarjeta) */
  pause() {
    this._paused = true;
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  /** Reanudar el timer de inactividad */
  resume() {
    this._paused = false;
    this.resetTimer();
  }

  private resetTimer() {
    if (this._paused) return;

    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.timeout = setTimeout(() => {
      this.ngZone.run(() => {
        if (!this._paused) {
          this.router.navigate(['/welcome']);
        }
      });
    }, this.idleTime);
  }
}
