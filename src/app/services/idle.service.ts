// src/app/services/idle.service.ts
import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { CatalogueService } from './catalogue.service';

@Injectable({ providedIn: 'root' })
export class IdleService {
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private idleTime = 5 * 60 * 1000; // 5 minutos de inactividad
  private readonly activityEvents = [
    'mousemove',
    'mousedown',
    'keydown',
    'wheel',
    'touchstart',
    'touchmove',
    'pointerdown',
    'pointermove'
  ] as const;
  private isWatching = false;

  constructor(
    private router: Router,
    private ngZone: NgZone,
    private catalogueService: CatalogueService
  ) {}

  startWatching() {
    if (this.isWatching) {
      return;
    }
    this.isWatching = true;
    this.resetTimer();

    this.activityEvents.forEach(evt => {
      window.addEventListener(evt, this.resetTimer.bind(this));
    });
  }

  private resetTimer() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.timeout = setTimeout(() => {
      this.ngZone.run(() => {
        this.catalogueService.refreshCatalogue()
          .finally(() => {
            if (this.router.url !== '/welcome') {
              this.router.navigate(['/welcome']);
            }
          });
      });
    }, this.idleTime);
  }
}
