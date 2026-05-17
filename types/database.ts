export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      disputes: {
        Row: {
          created_at: string | null
          id: string
          opened_by: string
          order_id: string
          reason: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          opened_by: string
          order_id: string
          reason: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          opened_by?: string
          order_id?: string
          reason?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          accepts_crypto: boolean | null
          asset_type: string
          audience_size: number | null
          audience_source: string | null
          created_at: string | null
          description: string | null
          estimated_value_cents: number | null
          geo: string[] | null
          id: string
          meta_ad_account_id: string | null
          meta_asset_id: string | null
          niche: string | null
          pixel_age_days: number | null
          price_cents: number | null
          primary_category: string | null
          retention_days: number | null
          secondary_categories: string[] | null
          seller_id: string
          source_event: string | null
          source_extra: Json | null
          source_name: string | null
          source_platform: string | null
          source_url: string | null
          status: string
          title: string
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          accepts_crypto?: boolean | null
          asset_type: string
          audience_size?: number | null
          audience_source?: string | null
          created_at?: string | null
          description?: string | null
          estimated_value_cents?: number | null
          geo?: string[] | null
          id?: string
          meta_ad_account_id?: string | null
          meta_asset_id?: string | null
          niche?: string | null
          pixel_age_days?: number | null
          price_cents?: number | null
          primary_category?: string | null
          retention_days?: number | null
          secondary_categories?: string[] | null
          seller_id: string
          source_event?: string | null
          source_extra?: Json | null
          source_name?: string | null
          source_platform?: string | null
          source_url?: string | null
          status?: string
          title: string
          transaction_type?: string
          updated_at?: string | null
        }
        Update: {
          accepts_crypto?: boolean | null
          asset_type?: string
          audience_size?: number | null
          audience_source?: string | null
          created_at?: string | null
          description?: string | null
          estimated_value_cents?: number | null
          geo?: string[] | null
          id?: string
          meta_ad_account_id?: string | null
          meta_asset_id?: string | null
          niche?: string | null
          pixel_age_days?: number | null
          price_cents?: number | null
          primary_category?: string | null
          retention_days?: number | null
          secondary_categories?: string[] | null
          seller_id?: string
          source_event?: string | null
          source_extra?: Json | null
          source_name?: string | null
          source_platform?: string | null
          source_url?: string | null
          status?: string
          title?: string
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string | null
          id: string
          order_id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          order_id: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          order_id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_cents: number | null
          buyer_confirmed_at: string | null
          buyer_id: string
          buyer_meta_ad_account_id: string | null
          coinbase_charge_code: string | null
          coinbase_charge_id: string | null
          completed_at: string | null
          created_at: string | null
          crypto_amount: string | null
          crypto_currency: string | null
          id: string
          listing_id: string
          meta_transfer_error: string | null
          meta_transfer_status: string | null
          payment_method: string
          platform_fee_cents: number | null
          seller_id: string
          seller_payout_cents: number | null
          seller_wallet_address: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          amount_cents?: number | null
          buyer_confirmed_at?: string | null
          buyer_id: string
          buyer_meta_ad_account_id?: string | null
          coinbase_charge_code?: string | null
          coinbase_charge_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          crypto_amount?: string | null
          crypto_currency?: string | null
          id?: string
          listing_id: string
          meta_transfer_error?: string | null
          meta_transfer_status?: string | null
          payment_method: string
          platform_fee_cents?: number | null
          seller_id: string
          seller_payout_cents?: number | null
          seller_wallet_address?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number | null
          buyer_confirmed_at?: string | null
          buyer_id?: string
          buyer_meta_ad_account_id?: string | null
          coinbase_charge_code?: string | null
          coinbase_charge_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          crypto_amount?: string | null
          crypto_currency?: string | null
          id?: string
          listing_id?: string
          meta_transfer_error?: string | null
          meta_transfer_status?: string | null
          payment_method?: string
          platform_fee_cents?: number | null
          seller_id?: string
          seller_payout_cents?: number | null
          seller_wallet_address?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          crypto_wallet: string | null
          display_name: string | null
          id: string
          is_verified: boolean | null
          meta_access_token: string | null
          meta_ad_account_id: string | null
          meta_business_id: string | null
          meta_token_expires: string | null
          preferred_chain: string | null
          rating: number | null
          stripe_account_id: string | null
          total_sales: number | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          crypto_wallet?: string | null
          display_name?: string | null
          id: string
          is_verified?: boolean | null
          meta_access_token?: string | null
          meta_ad_account_id?: string | null
          meta_business_id?: string | null
          meta_token_expires?: string | null
          preferred_chain?: string | null
          rating?: number | null
          stripe_account_id?: string | null
          total_sales?: number | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          crypto_wallet?: string | null
          display_name?: string | null
          id?: string
          is_verified?: boolean | null
          meta_access_token?: string | null
          meta_ad_account_id?: string | null
          meta_business_id?: string | null
          meta_token_expires?: string | null
          preferred_chain?: string | null
          rating?: number | null
          stripe_account_id?: string | null
          total_sales?: number | null
          username?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          order_id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          order_id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          order_id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_offers: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          offered_listing_id: string
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          offered_listing_id: string
          order_id: string
          status?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          offered_listing_id?: string
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_offers_offered_listing_id_fkey"
            columns: ["offered_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_offers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
// Convenience aliases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Listing = Database['public']['Tables']['listings']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type TradeOffer = Database['public']['Tables']['trade_offers']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Review = Database['public']['Tables']['reviews']['Row']
export type Dispute = Database['public']['Tables']['disputes']['Row']

export type ListingWithSeller = Listing & { seller: Profile }
export type OrderWithDetails = Order & { listing: Listing; buyer: Profile; seller: Profile }
