import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { CartFloatingComponent } from '../../shared/cart-floating/cart-floating.component';
import { Category } from '../../models/category.model';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule, CartFloatingComponent],
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.scss']
})
export class CategoryComponent implements OnInit {
  categories: Category[] = [];
  loading = false;
  error = false;
  
  constructor(
    private router: Router,
    private cartService: CartService,
    private productService: ProductService,
    private categoryService: CategoryService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  /**
   * Carga las categorías desde la API
   */
  loadCategories(): void {
    this.loading = true;
    this.error = false;
    
    this.categoryService.getCategories().subscribe({
      next: (response) => {
        this.categories = response.results;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.error = true;
        this.loading = false;
      }
    });
  }

  /**
   * Maneja la selección de una categoría y navega a la página correspondiente
   * @param category Categoría seleccionada
   */
  selectCategory(category: Category): void {
    const formattedCategory = category.slug.trim().toLowerCase();
    this.router.navigate(['/home'], { queryParams: { category: formattedCategory } });
  }

  /**
   * Maneja errores de carga de imagen con fallback
   * @param event Evento de error de imagen
   * @param category Categoría para generar placeholder
   */
  onImageError(event: any, category: Category): void {
    event.target.src = `https://via.placeholder.com/400x300/000000/FFD700?text=${category.name.toUpperCase()}`;
  }

  /**
   * Función trackBy para optimizar el rendering del ngFor
   * @param index Índice del elemento
   * @param category Categoría
   */
  trackByCategory(index: number, category: Category): number {
    return category.id;
  }
  

}
