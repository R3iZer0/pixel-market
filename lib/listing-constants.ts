export const CATEGORIES = [
  'Ecommerce & Retail',
  'Finance & Investing',
  'Health & Wellness',
  'Beauty & Cosmetics',
  'Real Estate',
  'Education & Online Courses',
  'Travel & Hospitality',
  'Software & SaaS',
  'Gaming',
  'Food & Beverage',
  'Automotive',
  'Fashion & Apparel',
  'Home & Garden',
  'Parenting & Family',
  'Sports & Fitness',
  'Entertainment & Media',
  'B2B / Business Services',
  'Crypto & Web3',
] as const

export const SOURCE_TYPES = {
  WEBSITE: {
    label: 'Website (Pixel)',
    events: ['PageView', 'ViewContent', 'Search', 'AddToCart', 'AddToWishlist', 'AddPaymentInfo', 'InitiateCheckout', 'Purchase', 'Lead', 'CompleteRegistration', 'Contact', 'Subscribe', 'StartTrial', 'Schedule', 'FindLocation', 'Donate'],
    extra: ['source_url', 'source_name'],
  },
  APP: {
    label: 'App',
    events: ['app_install', 'app_use', 'content_view', 'search', 'add_to_cart', 'add_to_wishlist', 'initiated_checkout', 'added_payment_info', 'purchase', 'rated', 'tutorial_completion', 'level_achieved', 'achievement_unlocked', 'spent_credits'],
    extra: ['source_name', 'source_url', 'source_platform'],
  },
  CUSTOM: {
    label: 'Customer List',
    events: [],
    extra: ['source_extra'],
  },
  LEAD_GENERATION: {
    label: 'Lead Ad Form',
    events: ['Opened form', 'Submitted form'],
    extra: ['source_name', 'source_url'],
  },
  PAGE: {
    label: 'Facebook Page Engagement',
    events: ['Visited Page', 'Engaged with post or ad', 'Clicked CTA', 'Sent message', 'Saved Page or post', 'Reacted/commented/shared'],
    extra: ['source_name', 'source_url'],
  },
  INSTAGRAM: {
    label: 'Instagram Engagement',
    events: ['Visited business profile', 'Engaged with post or ad', 'Sent message', 'Saved post or ad', 'Called business'],
    extra: ['source_name', 'source_url'],
  },
  VIDEO: {
    label: 'Video Engagement',
    events: ['Watched 3s', 'Watched 10s', 'Watched 25%', 'Watched 50%', 'Watched 75%', 'Watched 95%', 'Watched 100%'],
    extra: ['source_name'],
  },
  PRODUCT_CATALOG: {
    label: 'Shopping / Catalog',
    events: ['Viewed product', 'Added to cart', 'Purchased'],
    extra: ['source_name'],
  },
  CANVAS_AD: {
    label: 'Instant Experience',
    events: ['Opened Instant Experience', 'Clicked link inside'],
    extra: ['source_name'],
  },
  OFFLINE_EVENT: {
    label: 'Offline Activity',
    events: [],
    extra: ['source_name'],
  },
  WHATSAPP: {
    label: 'WhatsApp',
    events: ['Sent message', 'Received message', 'Read message', 'Clicked CTA'],
    extra: ['source_name'],
  },
} as const

export type SourceType = keyof typeof SOURCE_TYPES

export const GEO_OPTIONS = ['US', 'CA', 'GB', 'EU', 'AU', 'IN', 'BR', 'MX', 'JP', 'DE', 'FR', 'ES', 'IT', 'NL', 'WW']
