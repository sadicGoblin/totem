import { Injectable } from '@angular/core';

declare global {
  interface Window {
    electronAPI?: {
      exitKioskMode: () => void;
      enterKioskMode: () => void;
      onExitKioskResult: (callback: (result: {success: boolean}) => void) => void;
      getScreenOrientation: () => 'vertical' | 'horizontal';
    };
  }
}

@Injectable({
  providedIn: 'root'
})
export class ElectronService {
  private isElectron: boolean = false;
  private _isVerticalOrientation: boolean = false;

  constructor() {
    // Verificar si estamos en Electron
    this.isElectron = !!(window && window.electronAPI);
    
    // Detectar orientación de la pantalla
    if (this.isElectron) {
      this._isVerticalOrientation = window.electronAPI!.getScreenOrientation() === 'vertical';
    } else {
      // En modo navegador, detectar por proporciones de la ventana
      this._isVerticalOrientation = window.innerHeight > window.innerWidth;
    }
    
    // Escuchar cambios de tamaño de ventana para actualizar la orientación
    window.addEventListener('resize', () => {
      if (this.isElectron) {
        this._isVerticalOrientation = window.electronAPI!.getScreenOrientation() === 'vertical';
      } else {
        this._isVerticalOrientation = window.innerHeight > window.innerWidth;
      }
    });
  }

  get isElectronApp(): boolean {
    return this.isElectron;
  }
  
  get isVerticalOrientation(): boolean {
    return this._isVerticalOrientation;
  }

  exitKioskMode(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.isElectron) {
        console.warn('Modo de desarrollo: simulando salida del modo kiosko');
        // En modo desarrollo, simulamos que la operación fue exitosa
        setTimeout(() => {
          console.log('Simulación: Salida del modo kiosko exitosa');
          resolve(true);
        }, 500);
        return;
      }

      // Enviar mensaje para salir del modo kiosko
      window.electronAPI!.exitKioskMode();

      // Configurar callback para recibir respuesta
      window.electronAPI!.onExitKioskResult((result) => {
        resolve(result.success);
      });
    });
  }

  enterKioskMode(): void {
    if (!this.isElectron) {
      console.warn('Modo de desarrollo: simulando entrada al modo kiosko');
      console.log('Simulación: Entrada al modo kiosko exitosa');
      return;
    }

    window.electronAPI!.enterKioskMode();
  }
}
