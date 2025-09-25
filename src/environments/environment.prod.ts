import { CLIENT_CONFIG } from '../config/client.config';

export const environment = {
  production: true,
  apiUrl: CLIENT_CONFIG.apiBase,
  organizationSlug: CLIENT_CONFIG.organizationSlug,
  branding: CLIENT_CONFIG.branding,
  features: CLIENT_CONFIG.features
};
