export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  is_member: boolean;
  member_since: string;
  newsletter_subscribed: boolean;
  mailchimp_subscriber_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string | null;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  printful_order_id: string | null;
  status: "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount_amount: number;
  total: number;
  discount_code: string | null;
  shipping_name: string | null;
  shipping_address: ShippingAddress | null;
  customer_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  image: string;
}

export interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface SavedAddress {
  id: string;
  user_id: string;
  label: string;
  full_name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  current_uses: number;
  members_only: boolean;
  active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
}

export interface DiscountRedemption {
  id: string;
  discount_code_id: string;
  user_id: string | null;
  order_id: string | null;
  redeemed_at: string;
}

// Supabase Database type for typed client
export interface Database {
  public: {
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; email: string };
        Update: Partial<Profile>;
      };
      orders: {
        Row: Order;
        Insert: Partial<Order> & {
          stripe_session_id: string;
          items: OrderItem[];
          subtotal: number;
          total: number;
        };
        Update: Partial<Order>;
      };
      saved_addresses: {
        Row: SavedAddress;
        Insert: Partial<SavedAddress> & {
          user_id: string;
          full_name: string;
          address_line1: string;
          city: string;
          state: string;
          zip: string;
        };
        Update: Partial<SavedAddress>;
      };
      discount_codes: {
        Row: DiscountCode;
        Insert: Partial<DiscountCode> & {
          code: string;
          discount_type: "percentage" | "fixed";
          discount_value: number;
        };
        Update: Partial<DiscountCode>;
      };
      discount_redemptions: {
        Row: DiscountRedemption;
        Insert: Partial<DiscountRedemption> & { discount_code_id: string };
        Update: Partial<DiscountRedemption>;
      };
    };
  };
}
