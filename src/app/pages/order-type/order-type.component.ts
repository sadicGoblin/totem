import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-order-type',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-type.component.html',
  styleUrl: './order-type.component.scss'
})
export class OrderTypeComponent implements OnInit, OnDestroy {
  
  // Array de mascotas para animación
  mascotImages = [
    'assets/images/papa-johns-mascot.png',
    'assets/images/papa-johns-mascot-2.png',
    'assets/images/papa-johns-mascot-3.png',
    'assets/images/papa-johns-mascot-4.png'
  ];

  // Array de mensajes que puede decir la mascota
  mascotMessages = [
    '¡Elige tu opción favorita!',
    '¿Para servir o para llevar?',
    '¡Comparte con esa persona lo que más le gusta!',
    '¡Haz tu elección!',
    '¡La mejor pizza está aquí!'
  ];

  currentMascotImage = this.mascotImages[0];
  currentMessage = this.mascotMessages[0];
  showMascot = true;
  showMessage = false;
  private intervalId: any;

  constructor(private router: Router) {}

  ngOnInit() {
    this.startMascotAnimation();
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  startMascotAnimation() {
    this.intervalId = setInterval(() => {
      // Cambiar mascota y mensaje
      const randomMascotIndex = Math.floor(Math.random() * this.mascotImages.length);
      const randomMessageIndex = Math.floor(Math.random() * this.mascotMessages.length);
      
      this.currentMascotImage = this.mascotImages[randomMascotIndex];
      this.currentMessage = this.mascotMessages[randomMessageIndex];
      
      // Mostrar mensaje por 2 segundos
      this.showMessage = true;
      setTimeout(() => {
        this.showMessage = false;
      }, 2000);
      
    }, 4000); // Cada 4 segundos
  }

  selectOrderType(type: 'dine-in' | 'takeaway') {
    // Aquí puedes guardar la selección en un servicio
    console.log('Tipo de orden seleccionado:', type);
    
    // Navegar al catálogo
    this.router.navigate(['/category']);
  }
}
