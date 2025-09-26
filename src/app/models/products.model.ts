export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
  specialTag?: string;
  description?: string;
  discount?: number;
  originalPrice?: number;
  quantity?: number;
  size?: string; // Para pizzas: 'MEDIANA', 'FAMILIAR', 'XL'
}

export interface CartItem {
    productId: number;
    quantity: number;
    product: Product;
  }
  