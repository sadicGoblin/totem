import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { CartFloatingComponent } from '../../shared/cart-floating/cart-floating.component';
import { Category } from '../../models/category.model';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule, CartFloatingComponent, HttpClientModule],
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.scss']
})
export class CategoryComponent implements OnInit {
  categories: Category[] = [];
  isLoading = true;
  
  constructor(
    private router: Router,
    private cartService: CartService,
    private productService: ProductService,
    private categoryService: CategoryService
  ) {}

  /**
   * Inicializa el componente cargando las categorías desde la API
   */
  ngOnInit(): void {
    this.loadCategories();
  }

  /**
   * Carga las categorías desde la API
   */
  loadCategories(): void {
    this.isLoading = true;
    this.categoryService.getCategoriesResults().subscribe({
      next: (categories: Category[]) => {
        this.categories = categories;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.isLoading = false;
        // Fallback en caso de error - mostrar categorías por defecto
        this.categories = [];
      }
    });
  }
  
  // selectCategory(category: string): void {
  //   // Navegamos al home con el parámetro de categoría
  //   if (category.toLowerCase() === 'all' || category.toLowerCase() === 'todo') {
  //     // Si es 'all' o 'todo', no enviamos filtro de categoría
  //     this.router.navigate(['/home']);
  //   } else {
  //     // Enviamos el nombre de la categoría como está
  //     this.router.navigate(['/home'], { queryParams: { category } });
  //   }
  // }

  /**
   * Maneja la selección de una categoría y navega a la página correspondiente
   * @param category Slug de la categoría seleccionada
   */
  selectCategory(category: string): void {
    const formattedCategory = category.trim().toLowerCase();
    this.router.navigate(['/home'], { queryParams: { category: formattedCategory } });
  }

  /**
   * Maneja el error al cargar una imagen y establece una imagen de placeholder
   * @param event Evento del error de imagen
   * @param categoryName Nombre de la categoría para el placeholder
   */
  onImageError(event: any, categoryName: string): void {
    const img = event.target as HTMLImageElement;
    img.src = `https://via.placeholder.com/400x300/062fff/ffffff?text=${encodeURIComponent(categoryName)}`;
  }
  

}
