import { Component, OnInit, OnDestroy } from '@angular/core';
import { ElectronService } from '../../services/electron.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-screen-orientation',
  standalone: true,
  template: '',
  styles: []
})
export class ScreenOrientationComponent implements OnInit, OnDestroy {
  private resizeListener: any;
  
  constructor(private electronService: ElectronService) {}
  
  ngOnInit(): void {
    // Aplicar la clase de orientación cuando el componente inicia
    this.applyOrientationClass();
    
    // Configurar un listener para cambios de tamaño de ventana
    this.resizeListener = () => {
      this.applyOrientationClass();
    };
    
    window.addEventListener('resize', this.resizeListener);
  }
  
  ngOnDestroy(): void {
    // Limpiar el listener cuando el componente se destruye
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }
  
  private applyOrientationClass(): void {
    // Aplicar clase CSS al body basada en la orientación
    if (this.electronService.isVerticalOrientation) {
      document.body.classList.add('vertical-screen');
    } else {
      document.body.classList.remove('vertical-screen');
    }
  }
}
