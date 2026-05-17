import type { Json } from './database'

export type PublicListing = {
  id: string
  seller_id: string
  title: string
  description: string | null
  asset_type: 'pixel' | 'custom_audience' | 'lookalike_audience' | 'engagement_audience'
  transaction_type: string
  price_cents: number | null
  estimated_value_cents: number | null
  accepts_crypto: boolean | null
  audience_source: string | null
  source_event: string | null
  source_url: string | null
  source_name: string | null
  source_platform: string | null
  audience_size: number | null
  retention_days: number | null
  geo: string[] | null
  niche: string | null
  primary_category: string | null
  secondary_categories: string[] | null
  pixel_age_days: number | null
  status: string
  created_at: string | null
  updated_at: string | null
  source_extra: Json | null
  seller_username: string | null
  seller_display_name: string | null
  seller_avatar_url: string | null
  seller_verified: boolean | null
  seller_rating: number | null
  seller_total_sales: number | null
}
