export const CLIENT_CONFIG = {
  // ⭐ CAMBIAR SOLO ESTA LÍNEA POR CLIENTE
  organizationSlug: 'liquidos',
  
  // Configuración de API
  apiBase: 'http://catalogue.favric.cl/api',
  apiTimeout: 10000,
  
  // Personalización opcional por cliente
  branding: {
    primaryColor: '#000000',
    secondaryColor: '#FFD700',
    lightColor: '#FFF8DC',
    storeName: '', // Se obtiene de la API
    logoUrl: '', // Se obtiene de la API o se usa default
  },
  
  // Configuración de funcionalidades
  features: {
    printReceipts: true,
    qrCodeSupport: true,
    mobileCart: true,
    adminPanel: true
  }
};
