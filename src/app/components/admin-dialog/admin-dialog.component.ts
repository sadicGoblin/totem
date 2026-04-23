import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronService } from '../../services/electron.service';

@Component({
  selector: 'app-admin-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dialog.component.html',
  styleUrls: ['./admin-dialog.component.scss'],
})
export class AdminDialogComponent {
  /** Cadena para conservar ceros iniciales (ej. "0022"). */
  password = '';
  errorMessage: string = '';
  showDialog: boolean = false;
  showPassword: boolean = false;
  clickCounter: number = 0;
  requiredClicks: number = 5; // Requiere 5 clics para activar el diálogo

  constructor(private electronService: ElectronService) {}

  toggleDialog(): void {
    // Si el diálogo ya está abierto, simplemente cerrarlo
    if (this.showDialog) {
      this.showDialog = false;
      this.clickCounter = 0;
      return;
    }

    // Si el diálogo está cerrado, incrementar contador y verificar si alcanzó el límite
    this.clickCounter++;

    // Sólo mostrar el diálogo si se alcanzó el número requerido de clics
    if (this.clickCounter >= this.requiredClicks) {
      this.showDialog = true;
      this.errorMessage = '';
      this.clickCounter = 0; // Reiniciar contador después de mostrar
    }
  }

  promptPassword(): void {
    this.showPassword = true;
    this.errorMessage = '';
    this.password = '';
  }
  
  addDigit(digit: number): void {
    if (digit >= 0 && digit <= 9 && this.password.length < 4) {
      this.password += digit.toString();
    }
  }
  
  clearPassword(): void {
    this.password = '';
    this.errorMessage = '';
  }

  async exitKioskMode(): Promise<void> {
    const success = await this.electronService.exitKioskMode(this.password);
    console.log('exitKioskMode result:', success);

    if (success) {
      this.showDialog = false;
      this.showPassword = false;
      this.password = '';
    } else {
      this.errorMessage = 'Contraseña incorrecta';
      // Efecto visual para feedback de error
      setTimeout(() => {
        this.errorMessage = '';
      }, 2000);
    }
  }

  // Para evitar que los clics en el diálogo se propaguen al área del "botón escondido"
  stopPropagation(event: MouseEvent): void {
    event.stopPropagation();
  }
}
