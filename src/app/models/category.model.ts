export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string;
  style: string;
  state: string;
  icon_file: string | null;
  order: number;
  virtual: boolean;
  organization: any;
  parent: any;
  images: any[];
  childs: any;
}

export interface CategoryApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Category[];
}