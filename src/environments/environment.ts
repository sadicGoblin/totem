import { CLIENT_CONFIG } from '../config/client.config';

export const environment = {
  production: false,
  apiUrl: CLIENT_CONFIG.apiBase,
  catalogueCode: CLIENT_CONFIG.catalogueCode,
  branding: CLIENT_CONFIG.branding,
  features: CLIENT_CONFIG.features
};
