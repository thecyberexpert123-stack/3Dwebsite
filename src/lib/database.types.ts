/**
 * Minimal, hand-declared Supabase `Database` type for the tables the client
 * touches. Kept in sync with supabase/schema.sql by hand (a generated type
 * would be nice-to-have; not required for these few writes).
 *
 * NOTE: this postgrest-js version requires every table to carry an empty
 * `Relationships` list for the `Database extends GenericSchema` constraint to
 * hold — without it the whole client degrades to `never`.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string | null; name: string | null; user_role: "customer" | "admin"; created_at: string; updated_at: string };
        Insert: { id: string; email?: string | null; name?: string | null; user_role?: "customer" | "admin" };
        Update: { email?: string | null; name?: string | null; user_role?: "customer" | "admin" };
        Relationships: [];
      };
      saved_designs: {
        Row: { id: string; user_id: string; name: string; summary: string | null; config: Json; thumbnail: string | null; created_at: string; updated_at: string };
        Insert: { user_id?: string; name: string; summary?: string | null; config: Json; thumbnail?: string | null };
        Update: { name?: string; summary?: string | null; config?: Json; thumbnail?: string | null };
        Relationships: [];
      };
      orders: {
        Row: { id: string; customer_id: string | null; status: string; customer_name: string | null; customer_phone: string | null; notes: string | null; source: string; total_cents: number | null; created_at: string; updated_at: string };
        Insert: { customer_id?: string | null; status?: string; customer_name?: string | null; customer_phone?: string | null; notes?: string | null; source?: string; total_cents?: number | null };
        Update: { status?: string; customer_name?: string | null; customer_phone?: string | null; notes?: string | null; total_cents?: number | null };
        Relationships: [];
      };
      order_items: {
        Row: { id: string; order_id: string; design_name: string | null; config: Json | null; quantity: number | null; notes: string | null };
        Insert: { order_id: string; design_name?: string | null; config?: Json | null; quantity?: number | null; notes?: string | null };
        Update: { order_id?: string; design_name?: string | null; config?: Json | null; quantity?: number | null; notes?: string | null };
        Relationships: [];
      };
      leads: {
        Row: { id: string; user_id: string | null; name: string; phone: string | null; message: string | null; status: string; created_at: string };
        Insert: { user_id?: string | null; name: string; phone?: string | null; message?: string | null; status?: string };
        Update: { status?: string; phone?: string | null; message?: string | null };
        Relationships: [];
      };
      testimonials: {
        Row: { id: string; quote: string; author: string | null; approved: boolean; created_at: string };
        Insert: { quote: string; author?: string | null; approved?: boolean };
        Update: { quote?: string; author?: string | null; approved?: boolean };
        Relationships: [];
      };
      products: {
        Row: { id: string; name: string; category: string; blurb: string | null; description: string | null; image: string | null; alt: string | null; price_cents: number | null; stock: number | null; customizable: boolean; active: boolean; created_at: string; updated_at: string };
        Insert: { id: string; name: string; category: string; blurb?: string | null; description?: string | null; image?: string | null; alt?: string | null; price_cents?: number | null; stock?: number | null; customizable?: boolean; active?: boolean };
        Update: { id?: string; name?: string; category?: string; blurb?: string | null; description?: string | null; image?: string | null; alt?: string | null; price_cents?: number | null; stock?: number | null; customizable?: boolean; active?: boolean };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      admin_overview_v1: { Args: Record<string, never>; Returns: Record<string, number> };
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
  };
}
