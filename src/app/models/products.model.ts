export interface Product {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  short_description?: string;
  image?: string;
  icon_file?: string;
  sku?: string;
  price_1?: number | string;  // Precio principal (puede venir como string del backend)
  price_2?: number | string;  // Precio secundario/descuento
  currency?: string;
  weight?: number;
  manage_stock?: boolean;
  stock_quantity?: number;
  stock_status?: string;
  state?: string;
  order?: number;
  virtual?: boolean;
  organization?: number;
  brand?: any;
  categories?: any[];
  images?: any[];
  created?: string;
  modified?: string;
  parent?: number | null;
  
  // Campos opcionales para compatibilidad con código existente
  category?: string;
  price?: number;
  specialTag?: string;
  discount?: number;
  originalPrice?: number;
  quantity?: number;
}

export interface CartItem {
    productId: number;
    quantity: number;
    product: Product;
  }

/**
 * Obtiene el precio de un producto de forma segura
 * Prioriza price_1, luego price, y retorna 0 si ninguno está definido
 * Convierte strings a números automáticamente
 */
export function getProductPrice(product: Product): number {
  const price = product.price_1 ?? product.price ?? 0;
  return typeof price === 'string' ? parseFloat(price) : price;
}
  