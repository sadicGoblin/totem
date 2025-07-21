import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CartItem } from '../models/products.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItemsSubject = new BehaviorSubject<CartItem[]>([]);
  private cartTotalSubject = new BehaviorSubject<number>(0);

  constructor() { }

  // Obtener items del carrito como observable
  getCartItems(): Observable<CartItem[]> {
    return this.cartItemsSubject.asObservable();
  }

  // Obtener total del carrito como observable
  getCartTotal(): Observable<number> {
    return this.cartTotalSubject.asObservable();
  }

  // Actualizar los items del carrito
  updateCart(cartItems: CartItem[]): void {
    this.cartItemsSubject.next([...cartItems]);
    this.updateCartTotal(cartItems);
  }

  // Calcular el total del carrito
  private updateCartTotal(cartItems: CartItem[]): void {
    const total = cartItems.reduce((sum, item) => 
      sum + (item.product.price * item.quantity), 0);
    this.cartTotalSubject.next(total);
  }

  // Limpiar el carrito
  clearCart(): void {
    this.cartItemsSubject.next([]);
    this.cartTotalSubject.next(0);
  }
}
