export interface Product {
  id: number;
  sku: string;
  name: string;
  price: number;
  category: string;
  image: string;
  specialTag?: string;
  description?: string;
  discount?: number;
  originalPrice?: number;
  quantity?: number;
}

export interface CartItem {
    productId: number;
    quantity: number;
    product: Product;
  }
  