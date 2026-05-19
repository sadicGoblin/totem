import { Injectable } from '@angular/core';

declare global {
  interface Window {
    electronAPI?: {
      exitKioskMode: (password: string) => void;
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

  /** Misma regla que en main.js: "00" + día del mes (calendario local). */
  private dailyKioskExitPassword(): string {
    const day = new Date().getDate();
    return '00' + String(day);
  }

  /** Valida el PIN de administrador sin salir del modo kiosko. */
  isAdminPasswordValid(password: string): boolean {
    return password === this.dailyKioskExitPassword();
  }

  exitKioskMode(password: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.isElectron) {
        console.warn('Modo de desarrollo: simulando salida del modo kiosko');
        // En modo desarrollo, simulamos verificación de password
        setTimeout(() => {
          if (password === this.dailyKioskExitPassword()) {
            console.log('Simulación: Salida del modo kiosko exitosa');
            resolve(true);
          } else {
            console.log('Simulación: Contraseña incorrecta');
            resolve(false);
          }
        }, 500);
        return;
      }

      // Enviar mensaje con password para salir del modo kiosko
      window.electronAPI!.exitKioskMode(password);

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
