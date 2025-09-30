import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CartItem, Product, getProductPrice } from '../models/products.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly CART_STORAGE_KEY = 'totem_cart_items';
  private cartItemsSubject = new BehaviorSubject<CartItem[]>([]);
  private cartTotalSubject = new BehaviorSubject<number>(0);
  private cartCountSubject = new BehaviorSubject<number>(0);

  constructor() { 
    // Cargar carrito desde localStorage al inicio
    this.loadCartFromStorage();
  }

  // Obtener items del carrito como observable
  getCartItems(): Observable<CartItem[]> {
    return this.cartItemsSubject.asObservable();
  }

  // Obtener total del carrito como observable
  getCartTotal(): Observable<number> {
    return this.cartTotalSubject.asObservable();
  }
  
  // Obtener cantidad de items en el carrito
  getCartCount(): Observable<number> {
    return this.cartCountSubject.asObservable();
  }
  
  // Obtener valor actual de los items del carrito
  getCurrentCartItems(): CartItem[] {
    return this.cartItemsSubject.getValue();
  }
  
  // Obtener cantidad de un producto específico en el carrito
  getItemQuantity(productId: number): number {
    const cartItems = this.getCurrentCartItems();
    const cartItem = cartItems.find(item => item.product.id === productId);
    return cartItem ? cartItem.quantity : 0;
  }

  // Actualizar los items del carrito
  updateCart(cartItems: CartItem[]): void {
    const items = [...cartItems];
    this.cartItemsSubject.next(items);
    this.updateCartTotal(items);
    this.updateCartCount(items);
    this.saveCartToStorage(items);
  }
  
  // Añadir un producto al carrito
  addToCart(product: Product): void {
    const currentItems = this.getCurrentCartItems();
    const existingItemIndex = currentItems.findIndex(item => item.product.id === product.id);
    
    let updatedItems: CartItem[];
    
    if (existingItemIndex !== -1) {
      // Si el producto ya está en el carrito, incrementamos la cantidad
      updatedItems = [...currentItems];
      updatedItems[existingItemIndex].quantity += 1;
    } else {
      // Si no está en el carrito, lo añadimos
      updatedItems = [...currentItems, { 
        productId: product.id,
        product, 
        quantity: 1 
      }];
    }
    
    this.updateCart(updatedItems);
  }
  
  // Disminuir la cantidad de un producto en el carrito
  decreaseQuantity(productId: number): void {
    const currentItems = this.getCurrentCartItems();
    const existingItemIndex = currentItems.findIndex(item => item.product.id === productId);
    
    if (existingItemIndex !== -1) {
      const updatedItems = [...currentItems];
      
      if (updatedItems[existingItemIndex].quantity > 1) {
        // Reducir la cantidad si es mayor que 1
        updatedItems[existingItemIndex].quantity -= 1;
      } else {
        // Eliminar el item si la cantidad es 1
        updatedItems.splice(existingItemIndex, 1);
      }
      
      this.updateCart(updatedItems);
    }
  }
  
  // Eliminar un producto del carrito
  removeFromCart(productId: number): void {
    const currentItems = this.getCurrentCartItems();
    const updatedItems = currentItems.filter(item => item.product.id !== productId);
    this.updateCart(updatedItems);
  }

  // Calcular el total del carrito
  private updateCartTotal(cartItems: CartItem[]): void {
    const total = cartItems.reduce((sum, item) => 
      sum + (getProductPrice(item.product) * item.quantity), 0);
    this.cartTotalSubject.next(total);
  }
  
  // Actualizar contador de items
  private updateCartCount(cartItems: CartItem[]): void {
    const count = cartItems.reduce((total, item) => total + item.quantity, 0);
    this.cartCountSubject.next(count);
  }

  // Limpiar el carrito
  clearCart(): void {
    this.cartItemsSubject.next([]);
    this.cartTotalSubject.next(0);
    this.cartCountSubject.next(0);
    localStorage.removeItem(this.CART_STORAGE_KEY);
  }
  
  // Guardar el carrito en localStorage
  private saveCartToStorage(items: CartItem[]): void {
    localStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(items));
  }
  
  // Cargar el carrito desde localStorage
  private loadCartFromStorage(): void {
    try {
      const storedCart = localStorage.getItem(this.CART_STORAGE_KEY);
      if (storedCart) {
        const items = JSON.parse(storedCart) as CartItem[];
        this.cartItemsSubject.next(items);
        this.updateCartTotal(items);
        this.updateCartCount(items);
      }
    } catch (error) {
      console.error('Error al cargar el carrito desde localStorage:', error);
      // Si hay error, limpiamos el localStorage
      localStorage.removeItem(this.CART_STORAGE_KEY);
    }
  }
}
