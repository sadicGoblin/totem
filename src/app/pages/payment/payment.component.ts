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
    // Aquí iría la lógica para conectar con la impresora térmica
    console.log('Imprimiendo voucher para pago en caja...');
    
    // Datos que se enviarían a la impresora
    const voucherData = {
      orderNumber: this.orderNumberPreview,
      date: new Date().toLocaleString('es-CL'),
      total: this.cartTotal,
      items: [] // Aquí se añadirían los productos desde el carrito
    };
    
    // Aquí debería ir el código para conectar con la impresora térmica en Windows
    // Por ejemplo, usando una API REST, WebSocket o alguna librería específica
    
    /*
    NOTA: Hay varias formas de implementar esto dependiendo del hardware y software disponible:
    
    1. Si hay un servicio o aplicación en el Windows que expone un API:
       - Se podría hacer una llamada HTTP a ese servicio
       - Ejemplo: this.http.post('http://localhost:8080/print', voucherData);
    
    2. Si hay un WebSocket disponible:
       - Se podría enviar los datos a través de un WebSocket
       - Ejemplo: this.printSocket.send(JSON.stringify(voucherData));
       
    3. Si hay un plugin o componente nativo:
       - Se podría usar una integración con Electron para acceder a hardware
       - Ejemplo: require('electron').ipcRenderer.send('print-voucher', voucherData);
    */
    
    // Por ahora, simulamos que la impresión fue exitosa después de 2 segundos
    setTimeout(() => {
      this.voucherPrinted = true;
      console.log('Voucher impreso exitosamente');
    }, 2000);
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
