export const CLIENT_CONFIG = {
  // ⭐ CAMBIAR SOLO ESTA LÍNEA POR CLIENTE - Código del catálogo
  catalogueCode: 'CAT001',
  
  // Configuración de API.
  // Producción: 'https://catalogue.favric.cl/api'
  // Dev local : 'http://localhost:8050/api' (Docker local — comentar/descomentar antes del build).
  apiBase: 'https://catalogue.favric.cl/api',
  apiTimeout: 10000,

  // Microservicios locales del totem
  printerBase: 'http://127.0.0.1:8000',
  transbankBase: 'http://127.0.0.1:8081/api/transbank',
  
  // Intervalo de actualización del catálogo (en milisegundos)
  // Default: 5 minutos = 300000ms
  catalogueRefreshInterval: 300000,
  
  // Personalización opcional por cliente (se sobrescribe con datos de la API)
  branding: {
    primaryColor: '#2997db',
    secondaryColor: '#1054da',
    lightColor: '#e8f4fc',
    accentColor: '#3771ae',
    storeName: '', // Se obtiene de la API
    logoUrl: '', // Se obtiene de la API
    faviconUrl: '', // Se obtiene de la API
  },
  
  // Configuración de funcionalidades
  features: {
    printReceipts: true,
    bypassPaxForTesting: false,
    qrCodeSupport: true,
    mobileCart: true,
    adminPanel: true
  }
};
