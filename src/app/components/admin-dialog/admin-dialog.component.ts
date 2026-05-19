import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ElectronService } from '../../services/electron.service';
import { LocalSale, LocalSalesService, PrinterStatus } from '../../services/local-sales.service';
import { PrinterService, ProductoTicket } from '../../services/printer.service';
import { CatalogueService } from '../../services/catalogue.service';
import { CLIENT_CONFIG } from '../../../config/client.config';

type View = 'menu' | 'password' | 'main' | 'sales' | 'saleDetail' | 'refreshing';

@Component({
  selector: 'app-admin-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dialog.component.html',
  styleUrls: ['./admin-dialog.component.scss'],
})
export class AdminDialogComponent implements OnInit, OnDestroy {
  showDialog = false;
  view: View = 'password';

  password = '';
  errorMessage = '';

  clickCounter = 0;
  requiredClicks = 5;

  // ============ Inactividad ============
  private readonly INACTIVITY_MS = 15_000;     // 15s sin movimiento → mostrar prompt
  private readonly PROMPT_TIMEOUT_MS = 10_000; // 10s sin responder → cerrar
  showExtendPrompt = false;
  private inactivityTimer: any = null;
  private promptTimer: any = null;
  /** Vista activa antes de mostrar el prompt — para restaurar al "Seguir". */
  private previousView: View | null = null;

  sales: LocalSale[] = [];
  selectedSale: LocalSale | null = null;
  reprintingId: string | null = null;
  refreshMessage = '';
  refreshError = '';
  private salesSub: Subscription | null = null;

  constructor(
    private electronService: ElectronService,
    private localSales: LocalSalesService,
    private printerService: PrinterService,
    private catalogueService: CatalogueService,
  ) {}

  ngOnInit(): void {
    this.salesSub = this.localSales.getSales$().subscribe((s) => {
      this.sales = s;
      // Si hay una venta seleccionada en detalle, refrescar sus datos también
      if (this.selectedSale) {
        const updated = s.find((x) => x.id === this.selectedSale!.id);
        if (updated) this.selectedSale = updated;
      }
    });
  }

  ngOnDestroy(): void {
    this.salesSub?.unsubscribe();
    this.stopIdleTimers();
  }

  // ============================== Inactividad ==============================
  /** Reinicia el timer de inactividad. Llamar en cualquier evento del usuario. */
  resetIdleTimer(): void {
    if (!this.showDialog) return;
    if (this.showExtendPrompt) return; // si está pidiendo extensión, no resetear
    if (this.view === 'password') return; // mientras escribe PIN, no aplica
    this.stopIdleTimers();
    this.inactivityTimer = setTimeout(() => this.triggerExtendPrompt(), this.INACTIVITY_MS);
  }

  private triggerExtendPrompt(): void {
    this.previousView = this.view;
    this.showExtendPrompt = true;
    this.promptTimer = setTimeout(() => {
      this.closeDialog();
    }, this.PROMPT_TIMEOUT_MS);
  }

  /** El usuario pidió más tiempo. */
  extendSession(): void {
    this.showExtendPrompt = false;
    if (this.previousView) this.view = this.previousView;
    this.previousView = null;
    this.stopIdleTimers();
    this.resetIdleTimer();
  }

  /** Cierra todos los timers. */
  private stopIdleTimers(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    if (this.promptTimer) {
      clearTimeout(this.promptTimer);
      this.promptTimer = null;
    }
  }

  // ============================== Activación ==============================
  toggleDialog(): void {
    if (this.showDialog) {
      this.closeDialog();
      return;
    }
    this.clickCounter++;
    if (this.clickCounter >= this.requiredClicks) {
      this.openDialog();
      this.clickCounter = 0;
    }
  }

  private openDialog(): void {
    this.showDialog = true;
    this.view = 'password';
    this.password = '';
    this.errorMessage = '';
  }

  closeDialog(): void {
    this.showDialog = false;
    this.clickCounter = 0;
    this.view = 'password';
    this.password = '';
    this.errorMessage = '';
    this.refreshMessage = '';
    this.refreshError = '';
    this.selectedSale = null;
    this.stopIdleTimers();
  }

  // ============================== PIN ==============================
  addDigit(digit: number): void {
    if (digit >= 0 && digit <= 9 && this.password.length < 4) {
      this.password += digit.toString();
    }
  }

  clearPassword(): void {
    this.password = '';
    this.errorMessage = '';
  }

  validatePassword(): void {
    if (this.electronService.isAdminPasswordValid(this.password)) {
      this.errorMessage = '';
      this.view = 'main';
      this.resetIdleTimer();
    } else {
      this.errorMessage = 'Contraseña incorrecta';
      this.password = '';
      setTimeout(() => (this.errorMessage = ''), 2000);
    }
  }

  // ============================== Menú principal ==============================
  goToSales(): void {
    this.view = 'sales';
  }

  goBackToMenu(): void {
    this.view = 'main';
    this.refreshMessage = '';
    this.refreshError = '';
    this.selectedSale = null;
  }

  openSaleDetail(sale: LocalSale): void {
    this.selectedSale = sale;
    this.view = 'saleDetail';
  }

  closeSaleDetail(): void {
    this.selectedSale = null;
    this.view = 'sales';
  }

  async refreshCatalogue(): Promise<void> {
    this.view = 'refreshing';
    this.refreshMessage = 'Actualizando catálogo y playlists...';
    this.refreshError = '';
    try {
      await this.catalogueService.refreshCatalogue();
      this.refreshMessage = '✅ Catálogo actualizado correctamente';
      setTimeout(() => {
        if (this.view === 'refreshing') this.goBackToMenu();
      }, 1800);
    } catch (err: any) {
      this.refreshError = err?.message || 'No se pudo actualizar el catálogo';
    }
  }

  async exitKiosk(): Promise<void> {
    // El PIN ya fue validado en validatePassword(). exitKioskMode necesita
    // el mismo password para que el main.js lo verifique de su lado.
    const ok = await this.electronService.exitKioskMode(this.dailyPassword());
    if (ok) {
      this.closeDialog();
    } else {
      this.refreshError = 'No se pudo salir del modo kiosko';
    }
  }

  /** Recalcula el password actual (mismo algoritmo que ElectronService). */
  private dailyPassword(): string {
    const day = new Date().getDate();
    return '00' + String(day);
  }

  // ============================== Ventas (reintentar impresión) ==============================
  reprintSale(sale: LocalSale): void {
    if (!CLIENT_CONFIG.features.printReceipts || this.reprintingId) return;
    this.reprintingId = sale.id;
    this.localSales.markPrintError(sale.id, 'Reintentando...');

    const productos: ProductoTicket[] = sale.items.map((it) => ({
      nombre: it.name,
      cantidad: it.quantity,
      precio: it.price,
    }));

    this.printerService.imprimirTicket(
      productos,
      undefined,
      sale.orderNumber,
      sale.transaction || undefined,
    ).subscribe({
      next: (response) => {
        this.reprintingId = null;
        if (response.resultado === 'ok') {
          this.localSales.markPrinted(sale.id);
        } else {
          this.localSales.markPrintError(sale.id, response.mensaje || 'Error al imprimir');
        }
      },
      error: (err) => {
        this.reprintingId = null;
        const msg = err?.error?.mensaje || err?.message || 'Sin conexión con la impresora';
        this.localSales.markPrintError(sale.id, msg);
      },
    });
  }

  formatPrice(value: number, currency = 'CLP'): string {
    if (currency === 'CLP') return '$' + Math.round(value).toLocaleString('es-CL');
    return value.toLocaleString('es-CL', { style: 'currency', currency });
  }

  printerStatusLabel(status: PrinterStatus): string {
    switch (status) {
      case 'ok': return 'Impreso';
      case 'pending': return 'Pendiente';
      case 'error': return 'Error';
      case 'disabled': return 'Sin impresión';
      default: return status;
    }
  }

  stopPropagation(event: MouseEvent): void {
    event.stopPropagation();
  }
}
