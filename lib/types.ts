export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  description: string;
  story: string; // Scripture-inspired narrative
  images: string[];
  category: 'tees' | 'hoodies' | 'bottoms' | 'accessories';
  tags: string[];
  sizes: string[];
  colors: string[];
  featured: boolean;
  inStock: boolean;
  bestseller?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  size: string;
  color: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
}

export interface Testimonial {
  id: string;
  name: string;
  quote: string;
  image?: string;
}
