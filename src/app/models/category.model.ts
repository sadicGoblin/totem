export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string;
}

export interface CategoryApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Category[];
}
