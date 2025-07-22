import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { CartFloatingComponent } from '../../shared/cart-floating/cart-floating.component';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule, CartFloatingComponent],
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.scss']
})
export class CategoryComponent implements OnInit {
  
  constructor(
    private router: Router,
    private cartService: CartService,
    private productService: ProductService
  ) {}

  /**
   * Maneja la selección de una categoría y navega a la página correspondiente
   * @param category Categoría seleccionada
   */
  ngOnInit(): void {
    // Suscribirse a los cambios del carrito
  }
  
  selectCategory(category: string): void {
    // Navegamos al home con el parámetro de categoría
    if (category.toLowerCase() === 'all' || category.toLowerCase() === 'todo') {
      // Si es 'all' o 'todo', no enviamos filtro de categoría
      this.router.navigate(['/home']);
    } else {
      // Enviamos el nombre de la categoría como está
      this.router.navigate(['/home'], { queryParams: { category } });
    }
  }

}
