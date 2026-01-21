export const CLIENT_CONFIG = {
  // ⭐ CAMBIAR SOLO ESTA LÍNEA POR CLIENTE - Código del catálogo
  catalogueCode: 'CAT001',
  
  // Configuración de API
  apiBase: 'https://catalogue.favric.cl/api',
  apiTimeout: 10000,
  
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
    qrCodeSupport: true,
    mobileCart: true,
    adminPanel: true
  }
};
