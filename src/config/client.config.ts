export const CLIENT_CONFIG = {
  // ⭐ CAMBIAR SOLO ESTA LÍNEA POR CLIENTE
  organizationSlug: 'ticketpro',
  
  // Configuración de API
  apiBase: 'http://catalogue.favric.cl/api',
  apiTimeout: 10000,
  
  // Personalización opcional por cliente
  branding: {
    primaryColor: '#0066CC',
    secondaryColor: '#004d99',
    accentColor: '#3399ff',
    lightColor: '#e6f0ff',
    storeName: '', // Se obtiene de la API
    logoUrl: 'https://www.ticketpro.cl/assets/images/logotipoTP.png',
  },
  
  // Configuración de funcionalidades
  features: {
    printReceipts: true,
    qrCodeSupport: true,
    mobileCart: true,
    adminPanel: true
  }
};
