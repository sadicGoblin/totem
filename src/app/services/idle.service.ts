// src/app/services/idle.service.ts
import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class IdleService {
  private timeout: any;
  private idleTime = 60000; // 1 minuto de inactividad

  constructor(private router: Router, private ngZone: NgZone) {}

  startWatching() {
    this.resetTimer();

    ['mousemove', 'mousedown', 'keypress', 'touchstart'].forEach(evt => {
      window.addEventListener(evt, this.resetTimer.bind(this));
    });
  }

  private resetTimer() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.timeout = setTimeout(() => {
      this.ngZone.run(() => {
        this.router.navigate(['/welcome']);
      });
    }, this.idleTime);
  }
}
