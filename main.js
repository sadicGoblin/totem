const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');

/** Contraseña para salir del kiosko: "00" + día del mes local (ej. día 22 → "0022"). */
function getDailyKioskExitPassword(date = new Date()) {
  const day = date.getDate();
  return '00' + String(day);
}

// Mantener una referencia global del objeto window
// para evitar que la ventana se cierre automáticamente 
// cuando el objeto JavaScript sea eliminado por el recolector de basura.
let mainWindow;

function createWindow() {
  // Detectar dimensiones de la pantalla
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  // Determinamos la ruta correcta al archivo preload.js
  // En producción, app.isPackaged será true y el archivo estará en un lugar diferente
  let preloadPath;
  if (app.isPackaged) {
    // En modo producción, el archivo preload.js está en el directorio resources/app.asar/
    preloadPath = path.join(__dirname, 'preload.js');
  } else {
    // En modo desarrollo, el archivo preload.js está en el directorio raíz
    preloadPath = path.join(__dirname, 'preload.js');
  }
  
  console.log('Ruta al archivo preload:', preloadPath);
  
  // Crear la ventana del navegador.
  // Configurada para orientación vertical (alto > ancho)
  mainWindow = new BrowserWindow({
    width: width,   // 
    height: height, // 
    frame: false, // Elimina el marco de la ventana
    kiosk: true,  // Modo pantalla completa kiosco
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath
    }
  });
  
  // Detectar orientación de la pantalla e informar a la aplicación Angular
  const isVerticalScreen = height > width;
  global.sharedData = {
    isVerticalScreen: isVerticalScreen,
    screenWidth: width,
    screenHeight: height
  };

  // Cargar la aplicación Angular
  let startUrl;
  
  // En modo desarrollo
  if (process.env.NODE_ENV === 'development') {
    startUrl = 'http://localhost:4200';
    console.log('Ejecutando en modo desarrollo, cargando desde:', startUrl);
    
    // Permitir que la ventana cargue contenido de localhost (evita problemas CORS)
    mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
      (details, callback) => {
        callback({ requestHeaders: { Origin: '*', ...details.requestHeaders } });
      }
    );
    
    // Habilitar DevTools en desarrollo
    mainWindow.webContents.openDevTools();
  } else {
    // En modo producción
    // Importante: Asegúrate de que la ruta es correcta según la estructura de archivos generada
    startUrl = url.format({
      pathname: path.join(__dirname, 'dist/totem/browser/index.html'),
      protocol: 'file:',
      slashes: true
    });
    console.log('Ejecutando en modo producción, cargando desde:', startUrl);
  }
  
  mainWindow.loadURL(startUrl);

  // Abrir DevTools si estamos en desarrollo
  // mainWindow.webContents.openDevTools();

  // Cuando la ventana se cierre
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// Este método será llamado cuando Electron haya terminado
// la inicialización y esté listo para crear ventanas del navegador.
app.on('ready', createWindow);

// Salir cuando todas las ventanas estén cerradas.
app.on('window-all-closed', function () {
  // En macOS es común que las aplicaciones y sus barras de menú
  // permanezcan activas hasta que el usuario cierre explícitamente con Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // En macOS es común volver a crear una ventana en la aplicación cuando el
  // icono del dock es clicado y no hay otras ventanas abiertas.
  if (mainWindow === null) {
    createWindow();
  }
});

// En este archivo puedes incluir el resto del código específico del proceso principal de tu aplicación
// También puedes ponerlos en archivos separados y requerirlos aquí.

// Configurar comunicación IPC para control de pantalla completa
ipcMain.on('exit-kiosk-mode', (event, password) => {
  if (password === getDailyKioskExitPassword()) {
    if (mainWindow) {
      mainWindow.setKiosk(false);
      mainWindow.setFullScreen(false);
      // Restaurar a un tamaño normal (pero seguimos sin marcos)
      mainWindow.setSize(1024, 768);
      mainWindow.center();
      event.reply('exit-kiosk-result', { success: true });
    }
  } else {
    event.reply('exit-kiosk-result', { success: false });
  }
});

// Volver a modo kiosko
ipcMain.on('enter-kiosk-mode', () => {
  if (mainWindow) {
    mainWindow.setKiosk(true);
  }
});
