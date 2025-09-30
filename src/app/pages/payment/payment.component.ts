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

    if (method === 'card') {
      // Para el pago con tarjeta, mostramos la interfaz especial
      setTimeout(() => {
        // Simulamos un pago exitoso después de 10 segundos
        this.completeOrder();
      }, 10000);
    } else if (method === 'cash') {
      // Para pago en efectivo, generamos un número de pedido preliminar
      this.orderNumberPreview = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      
      // Aquí se imprime el voucher en la impresora térmica
      this.printVoucher();

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
    console.log('Enviando datos de productos al servidor de impresión...');

    this.cartService.getCartItems().subscribe(items => {
      // **LA CORRECCIÓN CLAVE ESTÁ AQUÍ**
      // Creamos un objeto que coincida con lo que el servidor Flask espera.
      const payload = {
        // Opcional: puedes enviar el nombre de la impresora si lo tienes
        // nombreImpresora: "nombre_de_tu_impresora_termica", 
        productos: items // 'items' ya debería tener el formato {nombre, cantidad, precio}
      };

      // Enviar el payload correcto al servidor de impresión
      fetch('http://localhost:8000/imprimir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload) // Enviamos el objeto con la clave "productos"
      })
      .then(res => {
        if (!res.ok) {
          // Si la respuesta no es 2xx, lanzamos un error para que lo capture el .catch
          throw new Error(`Error del servidor: ${res.status}`);
        }
        return res.json();
      })
      .then(result => {
        console.log('Resultado de la impresión:', result);
        if (result.resultado === 'ok') {
          this.voucherPrinted = true;
        }
      })
      .catch(err => {
        console.error('Error enviando a la impresora:', err);
        // Aquí podrías mostrar un mensaje de error al usuario
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
    if (this.selectedMethod === 'card') {
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
