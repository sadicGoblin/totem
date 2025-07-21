const { contextBridge, ipcRenderer } = require('electron');

// Exponer API segura a través del contexto de aislamiento
contextBridge.exposeInMainWorld('electronAPI', {
  // Funciones para salir del modo kiosko
  exitKioskMode: (password) => ipcRenderer.send('exit-kiosk-mode', password),
  enterKioskMode: () => ipcRenderer.send('enter-kiosk-mode'),
  
  // Manejar respuesta a intento de salida
  onExitKioskResult: (callback) => {
    ipcRenderer.on('exit-kiosk-result', (event, result) => callback(result));
    return () => ipcRenderer.removeAllListeners('exit-kiosk-result');
  },
  
  // Detectar orientación de pantalla directamente
  getScreenOrientation: () => {
    return window.innerHeight > window.innerWidth ? 'vertical' : 'horizontal';
  }
});
