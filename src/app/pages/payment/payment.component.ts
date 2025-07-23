import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.scss'
})
export class PaymentComponent {
  processingPayment = false;
  orderNumber = '';
  orderNumberPreview = '';
  cartTotal = 0;
  selectedMethod: 'cash' | 'mercadopago' | 'amipass' | 'card' | null = null;
  voucherPrinted = false;
  
  constructor(private router: Router, private cartService: CartService) {
    // Obtener el total del carrito
    this.cartService.getCartTotal().subscribe(total => {
      this.cartTotal = total;
    });
  }
  
  // Volver a la página anterior
  goBack(): void {
    this.router.navigate(['/checkout']);
  }
  
  // Formatear precio para mostrar como moneda
  formatPrice(price: number): string {
    return '$' + price.toLocaleString('es-CL');
  }
  
  // Seleccionar método de pago
  selectPaymentMethod(method: 'cash' | 'mercadopago' | 'amipass' | 'card'): void {
    this.selectedMethod = method;
    
    if(method === 'card') {
      // Para el pago con tarjeta, mostramos la interfaz especial
      // No activamos processingPayment porque usamos la vista específica
      
      // Aquí podríamos iniciar la comunicación con la máquina de pago
      // Por ahora solo simulamos un tiempo de espera para demo
      setTimeout(() => {
        // Simulamos un pago exitoso después de 10 segundos
        this.completeOrder();
      }, 10000);
    } else if(method === 'cash') {
      // Para pago en efectivo, generamos un número de pedido preliminar
      this.orderNumberPreview = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      
      // Aquí se imprimiría el voucher en la impresora térmica
      this.printVoucher();
      
      // No avanzamos automáticamente para que el cliente pueda ver la información
      // Esperará a que presionen el botón "ENTENDIDO"
    } else {
      // Para otros métodos (mercadopago, amipass), mostramos el spinner de procesamiento general
      this.processingPayment = true;
      
      // Simulamos un proceso de pago que toma tiempo
      setTimeout(() => {
        this.completeOrder();
      }, 3000);
    }
  }
  
  // Cancelar pago con tarjeta y volver a selección de método de pago
  cancelCardPayment(): void {
    this.selectedMethod = null;
  }
  
  // Método para imprimir el voucher en la impresora térmica
  printVoucher(): void {
    console.log('Preparando impresión con Parzibyte HTTP ESC/POS...');
    
    this.cartService.getCartItems().subscribe(items => {
      // Crear operaciones para imprimir ticket
      const operaciones: any[] = [
        { nombre: "Iniciar" },
        // Encabezado del ticket
        { nombre: "EstablecerAlineacion", argumentos: [1] }, // Centro: 1
        { nombre: "EstablecerEnfatizado", argumentos: [true] },
        { nombre: "EstablecerTamaño", argumentos: [1, 1] }, // Tamaño normal
        { nombre: "EscribirTexto", argumentos: ["RINNO KIOSKO\n"] },
        { nombre: "EstablecerTamaño", argumentos: [0, 0] }, // Tamaño normal
        { nombre: "EstablecerEnfatizado", argumentos: [false] },
        { nombre: "EscribirTexto", argumentos: ["================================\n"] },
        { nombre: "EscribirTexto", argumentos: [`Fecha: ${new Date().toLocaleString('es-CL')}\n`] },
        { nombre: "EscribirTexto", argumentos: [`Pedido #${this.orderNumberPreview}\n`] },
        { nombre: "EscribirTexto", argumentos: ["--------------------------------\n"] },
        
        // Alineación a la izquierda para productos
        { nombre: "EstablecerAlineacion", argumentos: [0] }, // Izquierda: 0
      ];
      
      // Agregar los productos
      if (items && items.length > 0) {
        // Encabezados
        operaciones.push(
          { nombre: "EstablecerEnfatizado", argumentos: [true] },
          { nombre: "EscribirTexto", argumentos: ["Cant.  Producto             Precio\n"] },
          { nombre: "EstablecerEnfatizado", argumentos: [false] },
          { nombre: "EscribirTexto", argumentos: ["--------------------------------\n"] }
        );
        
        // Productos individuales
        items.forEach(item => {
          const cantidad = item.quantity.toString().padEnd(5);
          const nombre = item.product.name.substring(0, 20).padEnd(20);
          const precio = this.formatPrice(item.product.price * item.quantity).padStart(9);
          
          operaciones.push(
            { nombre: "EscribirTexto", argumentos: [`${cantidad}${nombre}${precio}\n`] }
          );
          
          // Si tiene opciones seleccionadas, mostrarlas (comprobamos si existe la propiedad)
          const itemAny = item as any; // Usamos casting para acceder a propiedades que podrían no estar definidas en el tipo
          if (itemAny.selectedOptions && Array.isArray(itemAny.selectedOptions) && itemAny.selectedOptions.length > 0) {
            itemAny.selectedOptions.forEach((opt: any) => {
              operaciones.push(
                { nombre: "EscribirTexto", argumentos: [`      - ${opt.name}\n`] }
              );
            });
          }
        });
      } else {
        operaciones.push(
          { nombre: "EscribirTexto", argumentos: ["No hay productos en el carrito\n"] }
        );
      }
      
      // Footer del ticket
      operaciones.push(
        { nombre: "EscribirTexto", argumentos: ["--------------------------------\n"] },
        { nombre: "EstablecerAlineacion", argumentos: [2] }, // Derecha: 2
        { nombre: "EscribirTexto", argumentos: [`Subtotal: ${this.formatPrice(this.cartTotal)}\n`] },
        { nombre: "EstablecerEnfatizado", argumentos: [true] },
        { nombre: "EscribirTexto", argumentos: [`TOTAL: ${this.formatPrice(this.cartTotal)}\n`] },
        { nombre: "EstablecerEnfatizado", argumentos: [false] },
        { nombre: "EstablecerAlineacion", argumentos: [1] }, // Centro: 1
        { nombre: "Feed", argumentos: [1] },
        { nombre: "EscribirTexto", argumentos: ["Gracias por su compra!\n"] },
        { nombre: "Feed", argumentos: [3] }, // Avanzar papel
        { nombre: "Corte", argumentos: [] } // Cortar papel
      );
  
      // Enviar las operaciones al servidor de impresión
      fetch('http://localhost:8000/imprimir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(operaciones)
      })
      .then(res => res.json())
      .then(result => {
        console.log('Resultado impresión:', result);
        this.voucherPrinted = true;
        
        // Mostrar alerta solo si hay error
        if (!result.ok) {
          console.error('Error de impresión:', result.error || 'Error desconocido');
          alert('Error al imprimir. Por favor, revisa que la impresora esté conectada.');
        }
      })
      .catch(err => {
        console.error('Error enviando a la impresora:', err);
        alert('No se pudo conectar con el servidor de impresión. Asegúrate que esté ejecutándose en este equipo.');
      });
    });
  }
    
  
  // Confirmación de que el cliente ha visto el voucher impreso
  confirmVoucherPrinted(): void {
    // Completamos el pedido como con cualquier otro método de pago
    this.completeOrder();
  }
  
  // Completar el pedido después del pago
  completeOrder(): void {
    // Ocultamos la pantalla de pago
    if(this.selectedMethod === 'card') {
      
      this.processingPayment = false;
    }
    
    // Generamos un número de orden aleatorio
    this.orderNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    // Limpiar el carrito
    setTimeout(() => {
      this.cartService.clearCart();
      // Redirigir a la página de confirmación
      this.router.navigate(['/checkout'], { queryParams: { orderComplete: 'true', orderNumber: this.orderNumber } });
    }, 1000);
  }
}
