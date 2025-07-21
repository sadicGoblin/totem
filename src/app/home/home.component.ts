import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product, CartItem } from '../models/products.model';
import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  host: {
    '[class.landscape-mode]': 'isLandscapeMode'
  }
})
export class HomeComponent implements OnInit {
  isLandscapeMode: boolean = false;
  selectedCategory: string | null = 'HAMBURGUESAS';
  cartItems: CartItem[] = [];
  cartTotal: number = 0;
  cartItemCount: number = 0;
  showCart: boolean = false;
  
  categories = [
    'HAMBURGUESAS',
    'PIZZAS',
    'BEBIDAS',
    'POSTRES',
    'COMPLEMENTOS'
  ];
  
  products: Product[] = [];

  constructor(private productService: ProductService) {
    this.checkOrientation();
  }

  ngOnInit(): void {
    this.productService.getProducts().subscribe(products => {
      this.products = products;
    });
  }

  @HostListener('window:resize')
  checkOrientation(): void {
    this.isLandscapeMode = window.innerWidth > window.innerHeight;
  }

  setCategory(category: string | null): void {
    this.selectedCategory = category;
  }

  getFilteredProducts(): Product[] {
    return this.selectedCategory === null 
      ? this.products 
      : this.products.filter(p => p.category === this.selectedCategory);
  }
  
  formatPrice(price: number): string {
    return '$' + price.toLocaleString('es-CL');
  }
  
  addToCart(product: Product): void {
    const existingItem = this.cartItems.find(item => item.productId === product.id);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      this.cartItems.push({
        productId: product.id,
        product: product,
        quantity: 1
      });
    }
    
    this.updateCartTotals();
  }
  
  decreaseQuantity(product: Product): void {
    const index = this.cartItems.findIndex(item => item.productId === product.id);
    
    if (index !== -1) {
      if (this.cartItems[index].quantity > 1) {
        this.cartItems[index].quantity -= 1;
      } else {
        this.cartItems.splice(index, 1);
      }
      this.updateCartTotals();
    }
  }
  
  updateCartTotals(): void {
    this.cartItemCount = this.cartItems.reduce((total, item) => total + item.quantity, 0);
    this.cartTotal = this.cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  }
  
  getItemQuantityInCart(productId: number): number {
    const item = this.cartItems.find(item => item.productId === productId);
    return item ? item.quantity : 0;
  }
}
