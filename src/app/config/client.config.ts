/**
 * Configuración del cliente
 * Toda la configuración detallada (colores, logo, organización, etc.) 
 * se obtiene dinámicamente desde la API usando este slug.
 */

// Slug del cliente - cambiar este valor según el cliente que se desee usar
export const ACTIVE_CLIENT_SLUG = 'liquidos';

/**
 * Obtiene el slug del cliente configurado
 * @returns Slug del cliente
 */
export const getActiveClientSlug = (): string => {
  return ACTIVE_CLIENT_SLUG;
};
