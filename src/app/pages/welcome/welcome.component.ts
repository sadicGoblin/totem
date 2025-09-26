import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit, OnDestroy {
  
  // Array de imágenes de mascota para intercalar
  mascotImages = [
    'assets/images/papa-johns-mascot.png',
    'assets/images/papa-johns-mascot-2.png',
    'assets/images/papa-johns-mascot-3.png',
    'assets/images/papa-johns-mascot-4.png'
  ];
  
  currentMascotIndex = 0;
  currentMascotImage = this.mascotImages[0];
  private intervalId: any;

  constructor(private router: Router) {}

  ngOnInit() {
    // Intercalar imágenes cada 3 segundos
    this.intervalId = setInterval(() => {
      this.currentMascotIndex = (this.currentMascotIndex + 1) % this.mascotImages.length;
      this.currentMascotImage = this.mascotImages[this.currentMascotIndex];
    }, 3000);
  }

  ngOnDestroy() {
    // Limpiar el intervalo cuando el componente se destruye
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  navigateToCatalog() {
    this.router.navigate(['/order-type']);
  }
}
