export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  description: string;
  story: string; // Scripture-inspired narrative
  images: string[];
  colorImages?: Record<string, string[]>; // per-color image sets shown when a color is selected
  category: 'tees' | 'hoodies' | 'bottoms' | 'accessories';
  tags: string[];
  sizes: string[];
  colors: string[];
  featured: boolean;
  inStock: boolean;
  bestseller?: boolean;
  comingSoon?: boolean;
  membersOnly?: boolean;
  earlyAccessUntil?: string; // ISO date string — visible only to members before this date
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
