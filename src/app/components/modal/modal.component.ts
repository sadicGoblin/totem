import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product, getProductPrice } from '../../models/products.model';

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
  
  formatPrice(price: number | string | undefined): string {
    if (price === undefined || price === null) {
      return '$0';
    }
    // Convertir a número si viene como string
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    // Formatear con separador de miles (punto) y sin decimales
    return '$' + Math.round(numPrice).toLocaleString('es-CL');
  }
  
  getPrice(product: Product | null): number {
    return product ? getProductPrice(product) : 0;
  }
  
  // Cerrar modal si se hace clic en el fondo (backdrop)
  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }
}
