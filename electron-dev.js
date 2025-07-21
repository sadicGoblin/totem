// Script para ejecutar Electron en modo desarrollo
process.env.NODE_ENV = 'development';
const waitOn = require('wait-on');
const { spawn } = require('child_process');
const electron = require('electron');
const path = require('path');

// URL del servidor de desarrollo de Angular
const serverURL = 'http://localhost:4200';

console.log(`Esperando a que el servidor de Angular esté disponible en ${serverURL}...`);

// Esperar a que el servidor de Angular esté disponible antes de iniciar Electron
waitOn({ resources: [serverURL], timeout: 30000 })
  .then(() => {
    console.log('¡Servidor Angular detectado! Iniciando Electron...');
    
    // Ejecuta electron con el main.js
    const child = spawn(electron, [path.join(__dirname, 'main.js')], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'development'
      }
    });

    child.on('close', (code) => {
      console.log(`Electron se cerró con código: ${code}`);
      process.exit(code);
    });
  })
  .catch((err) => {
    console.error(`Error esperando al servidor Angular: ${err}`);
    process.exit(1);
  });
