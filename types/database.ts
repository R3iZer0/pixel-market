export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type AssetType = 'pixel' | 'custom_audience' | 'lookalike_audience' | 'engagement_audience'
export type TransactionType = 'sale' | 'trade' | 'both'
export type ListingStatus = 'active' | 'paused' | 'sold' | 'expired'
export type OrderStatus = 'pending_payment' | 'paid' | 'transferring' | 'transferred' | 'completed' | 'disputed' | 'refunded' | 'cancelled'
export type PaymentMethod = 'stripe' | 'coinbase' | 'trade'
export type MetaTransferStatus = 'pending' | 'sent' | 'accepted' | 'failed'
export type TradeOfferStatus = 'pending' | 'accepted' | 'rejected'
export type DisputeStatus = 'open' | 'resolved_buyer' | 'resolved_seller' | 'escalated'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          stripe_account_id: string | null
          crypto_wallet: string | null
          preferred_chain: string | null
          meta_access_token: string | null
          meta_token_expires: string | null
          meta_business_id: string | null
          meta_ad_account_id: string | null
          is_verified: boolean
          rating: number | null
          total_sales: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'is_verified' | 'total_sales' | 'created_at'> & {
          is_verified?: boolean
          total_sales?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      listings: {
        Row: {
          id: string
          seller_id: string
          title: string
          description: string | null
          asset_type: AssetType
          transaction_type: TransactionType
          price_cents: number | null
          estimated_value_cents: number | null
          accepts_crypto: boolean
          meta_asset_id: string | null
          meta_ad_account_id: string | null
          audience_source: string | null
          source_event: string | null
          source_url: string | null
          source_name: string | null
          source_platform: string | null
          source_extra: Json | null
          audience_size: number | null
          retention_days: number | null
          geo: string[] | null
          niche: string | null
          primary_category: string | null
          secondary_categories: string[] | null
          pixel_age_days: number | null
          status: ListingStatus
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['listings']['Row'], 'id' | 'status' | 'created_at' | 'updated_at'> & {
          id?: string
          status?: ListingStatus
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['listings']['Insert']>
      }
      orders: {
        Row: {
          id: string
          listing_id: string
          buyer_id: string
          seller_id: string
          transaction_type: 'sale' | 'trade'
          payment_method: PaymentMethod
          amount_cents: number | null
          platform_fee_cents: number | null
          seller_payout_cents: number | null
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          coinbase_charge_id: string | null
          coinbase_charge_code: string | null
          crypto_currency: string | null
          crypto_amount: string | null
          seller_wallet_address: string | null
          buyer_meta_ad_account_id: string | null
          meta_transfer_status: MetaTransferStatus | null
          meta_transfer_error: string | null
          status: OrderStatus
          buyer_confirmed_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'status' | 'created_at' | 'updated_at'> & {
          id?: string
          status?: OrderStatus
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }
      trade_offers: {
        Row: {
          id: string
          order_id: string
          offered_listing_id: string
          status: TradeOfferStatus
          message: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['trade_offers']['Row'], 'id' | 'status' | 'created_at'> & {
          id?: string
          status?: TradeOfferStatus
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['trade_offers']['Insert']>
      }
      messages: {
        Row: {
          id: string
          order_id: string
          sender_id: string
          body: string
          read_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
      }
      reviews: {
        Row: {
          id: string
          order_id: string
          reviewer_id: string
          reviewee_id: string
          rating: number
          body: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['reviews']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>
      }
      disputes: {
        Row: {
          id: string
          order_id: string
          opened_by: string
          reason: string
          status: DisputeStatus
          created_at: string
          resolved_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['disputes']['Row'], 'id' | 'status' | 'created_at'> & {
          id?: string
          status?: DisputeStatus
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['disputes']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Listing = Database['public']['Tables']['listings']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type TradeOffer = Database['public']['Tables']['trade_offers']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Review = Database['public']['Tables']['reviews']['Row']
export type Dispute = Database['public']['Tables']['disputes']['Row']

export type ListingWithSeller = Listing & { seller: Profile }
export type OrderWithDetails = Order & { listing: Listing; buyer: Profile; seller: Profile }
