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

  constructor(private electronService: ElectronService) {}

  toggleDialog(): void {
    this.showDialog = !this.showDialog;
    if (this.showDialog) {
      this.password = '';
      this.errorMessage = '';
    }
  }

  async submitPassword(): Promise<void> {
    if (!this.password) {
      this.errorMessage = 'Ingrese la contraseña';
      return;
    }

    const success = await this.electronService.exitKioskMode(this.password);
    
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
