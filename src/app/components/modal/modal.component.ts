import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../models/products.model';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalComponent {
  @Input() product: Product | null = null;
  @Input() isOpen = false;
  @Input() initialQuantity = 0;
  
  localQuantity = 0;
  
  @Output() close = new EventEmitter<void>();
  @Output() addToCart = new EventEmitter<{product: Product, quantity: number}>();
  
  ngOnChanges(): void {
    if (this.isOpen) {
      this.localQuantity = this.initialQuantity;
    }
  }
  
  closeModal(): void {
    this.close.emit();
  }
  
  increase(): void {
    this.localQuantity++;
    // Emitir evento para añadir al carrito
    if (this.product) {
      this.addToCart.emit({product: this.product, quantity: 1});
    }
  }
  
  decrease(): void {
    if (this.localQuantity > 0) {
      this.localQuantity--;
      // Emitir evento para remover del carrito
      if (this.product) {
        this.addToCart.emit({product: this.product, quantity: -1});
      }
    }
  }
  
  formatPrice(price: number): string {
    return '$' + price.toLocaleString('es-CL');
  }
  
  // Cerrar modal si se hace clic en el fondo (backdrop)
  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }
}
