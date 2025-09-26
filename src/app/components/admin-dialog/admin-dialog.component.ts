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
  password: number = 0;
  correctPassword: number = 1234;
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
    this.password = 0;
  }
  
  addDigit(digit: number): void {
    // Si es un número entre 0-9, agregarlo al final
    if (digit >= 0 && digit <= 9) {
      // Convertir el password actual a string, agregar el dígito y volver a número
      const currentStr = this.password.toString();
      // Solo permitimos un máximo de 4 dígitos
      if (currentStr.length < 4) {
        this.password = Number(currentStr + digit.toString());
      }
    }
  }
  
  clearPassword(): void {
    this.password = 0;
    this.errorMessage = '';
  }

  async exitKioskMode(): Promise<void> {
    console.log('Contraseña ingresada:', this.password);
    console.log('Contraseña correcta:', this.correctPassword);
    if (this.password === this.correctPassword) {
      console.log('Contraseña correcta, cerrando aplicación...');
      // Cerrar la aplicación completamente
      this.electronService.closeApplication();
    } else {
      this.errorMessage = 'Contraseña incorrecta';
      console.log('Contraseña incorrecta', this.password);
      // Limpiar la contraseña después de error
      this.password = 0;
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
