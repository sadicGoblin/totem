import { Injectable } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { BehaviorSubject, filter } from 'rxjs';
import { CartService } from './cart.service';
import { ProductService } from './product.service';

@Injectable({
  providedIn: 'root'
})
export class UrlParamsService {
  private skuProcessedSubject = new BehaviorSubject<string | null>(null);
  private productAddedSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private router: Router,
    private cartService: CartService,
    private productService: ProductService
  ) {
    this.initializeUrlParamWatcher();
  }

  // Inicializar el observador de parámetros de URL
  private initializeUrlParamWatcher(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      // Pequeño delay para evitar procesamiento múltiple
      setTimeout(() => {
        this.checkForSkuParam();
      }, 100);
    });
    
    // Verificar inmediatamente al inicializar con delay
    setTimeout(() => {
      this.checkForSkuParam();
    }, 200);
  }

  // Verificar si hay parámetros SKU en la URL
  private checkForSkuParam(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const skuParam = urlParams.get('sku');
    const skusParam = urlParams.get('skus');
    
    if (skuParam && skuParam !== this.skuProcessedSubject.getValue()) {
      this.processSku(skuParam);
    } else if (skusParam && skusParam !== this.skuProcessedSubject.getValue()) {
      this.processMultipleSkus(skusParam);
    }
  }

  // Procesar múltiples SKUs separados por comas
  private processMultipleSkus(skusString: string): void {
    const skus = skusString.split(',').map(sku => sku.trim()).filter(sku => sku.length > 0);
    
    if (skus.length === 0) return;

    // Marcar como procesado para evitar duplicados
    this.skuProcessedSubject.next(skusString);

    this.productService.getProducts().subscribe(response => {
      const foundProducts: any[] = [];
      const notFoundSkus: string[] = [];

      skus.forEach(sku => {
        const apiProduct = response.results.find((p: any) => p.sku === sku);
        if (apiProduct) {
          // Convertir al formato esperado por el carrito
          const product = {
            id: apiProduct.id,
            sku: apiProduct.sku,
            name: apiProduct.name,
            price: apiProduct.price,
            category: String(apiProduct.category),
            image: apiProduct.image,
            description: apiProduct.description,
            discount: apiProduct.discount,
            specialTag: apiProduct.specialTag,
            originalPrice: apiProduct.originalPrice,
            quantity: apiProduct.quantity
          };
          foundProducts.push(product);
          this.cartService.addToCart(product);
        } else {
          notFoundSkus.push(sku);
        }
      });

      // Notificar resultados
      if (foundProducts.length > 0) {
        this.showMultipleProductsAddedNotification(foundProducts);
      }

      if (notFoundSkus.length > 0) {
        this.showMultipleErrorNotification(notFoundSkus);
      }

      // Limpiar parámetros de la URL
      this.clearSkusFromUrl();

      // Navegar al carrito
      if (foundProducts.length > 0) {
        setTimeout(() => {
          this.router.navigate(['/cart']);
        }, 2000);
      }
    });
  }

  // Procesar el SKU encontrado en la URL
  private processSku(sku: string): void {
    this.productService.getProducts().subscribe(response => {
      const apiProduct = response.results.find((p: any) => p.sku === sku);
      
      if (apiProduct) {
        // Convertir al formato esperado por el carrito
        const product = {
          id: apiProduct.id,
          sku: apiProduct.sku,
          name: apiProduct.name,
          price: apiProduct.price,
          category: String(apiProduct.category),
          image: apiProduct.image,
          description: apiProduct.description,
          discount: apiProduct.discount,
          specialTag: apiProduct.specialTag,
          originalPrice: apiProduct.originalPrice,
          quantity: apiProduct.quantity
        };
        this.cartService.addToCart(product);
        this.skuProcessedSubject.next(sku);
        this.productAddedSubject.next(true);
        
        // Notificar éxito
        this.showProductAddedNotification(product.name);
        
        // Limpiar el parámetro de la URL sin recargar la página
        this.clearSkuFromUrl();
        
        // Navegar al carrito para mostrar el producto añadido
        setTimeout(() => {
          this.router.navigate(['/cart']);
        }, 1500);
      } else {
        console.warn(`Producto con SKU ${sku} no encontrado`);
        this.showErrorNotification(sku);
      }
    });
  }

  // Limpiar parámetro SKU de la URL
  private clearSkuFromUrl(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete('sku');
    window.history.replaceState({}, document.title, url.pathname + url.hash);
  }

  // Mostrar notificación de producto añadido
  private showProductAddedNotification(productName: string): void {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        max-width: 300px;
        font-family: Arial, sans-serif;
        animation: slideIn 0.3s ease-out;
      ">
        <strong>✅ Producto añadido</strong><br>
        ${productName}
      </div>
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
    `;
    
    document.body.appendChild(notification);
    
    // Eliminar notificación después de 3 segundos
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  // Mostrar notificación de error
  private showErrorNotification(sku: string): void {
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #f44336;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        max-width: 300px;
        font-family: Arial, sans-serif;
        animation: slideIn 0.3s ease-out;
      ">
        <strong>❌ Producto no encontrado</strong><br>
        SKU: ${sku}
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  // Obtener observable del último SKU procesado
  getProcessedSku() {
    return this.skuProcessedSubject.asObservable();
  }

  // Obtener observable de producto añadido
  getProductAdded() {
    return this.productAddedSubject.asObservable();
  }

  // Método manual para procesar SKU (útil para testing)
  processSkuManually(sku: string): void {
    this.processSku(sku);
  }

  // Limpiar múltiples parámetros SKU de la URL
  private clearSkusFromUrl(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete('sku');
    url.searchParams.delete('skus');
    window.history.replaceState({}, document.title, url.pathname + url.hash);
  }

  // Mostrar notificación de múltiples productos añadidos
  private showMultipleProductsAddedNotification(products: any[]): void {
    const productNames = products.map(p => p.name).join(', ');
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        max-width: 350px;
        font-family: Arial, sans-serif;
        animation: slideIn 0.3s ease-out;
      ">
        <strong>✅ ${products.length} productos añadidos</strong><br>
        ${productNames}
      </div>
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 4000);
  }

  // Mostrar notificación de múltiples errores
  private showMultipleErrorNotification(skus: string[]): void {
    const skuList = skus.join(', ');
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 80px;
        right: 20px;
        background-color: #f44336;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        max-width: 350px;
        font-family: Arial, sans-serif;
        animation: slideIn 0.3s ease-out;
      ">
        <strong>❌ ${skus.length} SKUs no encontrados</strong><br>
        ${skuList}
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 4000);
  }
}
