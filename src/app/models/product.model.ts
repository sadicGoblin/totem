export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  price_1?: number; // Precio del backend
  image: string;
  images?: Array<{id: number, image: string, name?: string}>; // Imágenes del backend
  sku: string;
  stock?: number;
  category: number | string; // Compatible con ambos tipos
  categories?: Array<{id: number, name: string, slug: string}>; // Categorías del backend
  organization: number;
  state: string;
  featured?: boolean;
  discount?: number;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  // Campos para compatibilidad con el modelo viejo
  specialTag?: string;
  originalPrice?: number;
  quantity?: number;
}

export interface ProductApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}
