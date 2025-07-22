import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronService } from '../../services/electron.service';

@Component({
  selector: 'app-admin-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dialog.component.html',
  styleUrls: ['./admin-dialog.component.scss']
})
export class AdminDialogComponent {
  password: string = '';
  errorMessage: string = '';
  showDialog: boolean = false;
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
      this.password = '';
      this.errorMessage = '';
      this.clickCounter = 0; // Reiniciar contador después de mostrar
    }
  }

  async exitKioskMode(): Promise<void> {
    const success = await this.electronService.exitKioskMode();
    
    if (success) {
      this.showDialog = false;
    } else {
      this.errorMessage = 'Contraseña incorrecta';
      this.password = '';
    }
  }

  // Para evitar que los clics en el diálogo se propaguen al área del "botón escondido"
  stopPropagation(event: MouseEvent): void {
    event.stopPropagation();
  }
}
