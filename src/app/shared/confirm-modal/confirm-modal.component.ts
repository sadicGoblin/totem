import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-modal.component.html',
  styleUrl: './confirm-modal.component.scss'
})
export class ConfirmModalComponent {
  @Input() visible: boolean = false;
  @Input() title: string = '¿Estás seguro?';
  @Input() message: string = '¿Deseas continuar con esta acción?';
  @Input() confirmText: string = 'Confirmar';
  @Input() cancelText: string = 'Cancelar';
  @Input() confirmType: 'danger' | 'warning' | 'primary' = 'danger';
  
  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();
  @Output() visibleChange = new EventEmitter<boolean>();
  
  confirm(): void {
    this.onConfirm.emit();
    this.close();
  }
  
  cancel(): void {
    this.onCancel.emit();
    this.close();
  }
  
  close(): void {
    this.visible = false;
    this.visibleChange.emit(this.visible);
  }
  
  stopPropagation(event: MouseEvent): void {
    event.stopPropagation();
  }
}
