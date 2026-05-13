export interface UserProfile {
  id: string
  username: string | null
  email: string
  bio: string | null
  avatar_url: string | null
  goal: 'browse' | 'create' | 'earn' | null
  style_prefs: string[]
  plan: 'free' | 'pro'
  wallet_balance: number
  total_earned: number
  is_email_verified: boolean
  user_tier: 'founder' | 'early_user' | 'general'
  referral_code: string | null
  referred_by: string | null
  is_following: boolean
  followers_count: number
  following_count: number
  sets_count: number
  total_likes: number
  show_followers: boolean
  // Location (shown publicly)
  location: string | null
  // Demographic fields (only populated when viewing own profile)
  age_range: '18-24' | '25-34' | '35-44' | '45-54' | '55+' | null
  gender_identity: string | null
  discovery_source: 'reddit' | 'tiktok' | 'friend' | 'instagram' | 'pinterest' | 'search' | 'other' | null
  // Onboarding tracking (only populated when viewing own profile)
  onboarding_step: number | null
  onboarding_completed_at: string | null
}

export interface TokenResponse {
  access_token: string
  token_type: 'bearer'
  user: UserProfile
}

export interface CreatorMini {
  id: string
  username: string | null
  avatar_url: string | null
  user_tier?: string
}

export type ItemStatus = 'pending' | 'processing' | 'ready' | 'failed'

export interface Item {
  id: string
  user_id: string
  original_url: string | null
  affiliate_url: string | null
  processed_image_url: string | null
  product_name: string | null
  price: number | null
  currency: string
  category: string | null
  brand: string | null
  merchant: string | null
  status: ItemStatus
  linked_url: string | null
  linked_title: string | null
  linked_description: string | null
  linked_image_url: string | null
  created_at: string
}

export type SetPrivacy = 'public' | 'private' | 'unlisted'

export interface CanvasObject {
  type: string
  left: number
  top: number
  width?: number
  height?: number
  scaleX?: number
  scaleY?: number
  angle?: number
  opacity?: number
  flipX?: boolean
  flipY?: boolean
  item_id?: string
  affiliate_url?: string
  merchant?: string
  price?: number
  product_name?: string
  src?: string
  linked_url?: string | null
  linked_title?: string | null
  linked_description?: string | null
  linked_image_url?: string | null
}

export interface CanvasJSON {
  version: string
  objects: CanvasObject[]
  background?: string
}

export interface SetResponse {
  id: string
  user_id: string
  title: string
  slug: string | null
  canvas_json: CanvasJSON
  thumbnail_url: string | null
  aesthetic_tags: string[]
  privacy: SetPrivacy
  is_published: boolean
  like_count: number
  view_count: number
  creator: CreatorMini | null
  remix_of_id: string | null
  parent_set_id: string | null
  created_at: string
  updated_at: string
  is_liked: boolean
  is_following_creator: boolean
  is_owner: boolean
}

export interface SetFeedCard {
  id: string
  title: string
  slug: string | null
  thumbnail_url: string | null
  aesthetic_tags: string[]
  like_count: number
  view_count: number
  creator: CreatorMini | null
  created_at: string
  is_liked: boolean
  is_followed_creator: boolean
  section?: 'following' | 'algorithmic'
}

export interface LikeToggleResponse {
  liked: boolean
  like_count: number
}

export interface CreatorEarnings {
  wallet_balance: number
  pending_balance: number
  total_earned: number
  this_week: number
  total_clicks: number
  total_conversions: number
  conversion_rate: number
  top_set: {
    set_id: string
    title: string
    clicks: number
    revenue: number
  } | null
  payout_minimum: number
  can_request_payout: boolean
}

export interface ReferralCodeResponse {
  code: string
  share_url: string
  direct_url: string
  total_referred: number
  referred_this_month: number
  bonus_pct: number
  window_days: number
}

export interface ReferralStatsResponse {
  total_referred: number
  referred_this_week: number
  referred_this_month: number
  active_referred_users: number
  total_bonus_earned: number
  bonus_this_month: number
  bonus_rate: number
  attribution_window_days: number
}

export interface ReferredUserItem {
  id: string
  username: string | null
  avatar_url: string | null
  joined_at: string
  sets_published: number
  total_earned: number
}

export interface ReferredUsersResponse {
  users: ReferredUserItem[]
  total: number
  limit: number
  offset: number
}

// ── Trend Signal Types ──────────────────────────────────────

export interface TrendTrajectoryPoint {
  date: string
  count: number
}

export interface TrendMetricSummary {
  metric_type: 'likes' | 'saves' | 'searches' | 'tags'
  current_count: number
  previous_count: number
  percent_change: number
  trajectory: TrendTrajectoryPoint[]
}

export interface TrendPeriod {
  aesthetic: string
  metrics: TrendMetricSummary[]
  overall_percent_change: number
  is_rising: boolean
}

export interface TrendTrajectory {
  aesthetic: string
  days: number
  metrics: TrendMetricSummary[]
}

export interface TrendTeaser {
  aesthetic: string
  overall_percent_change: number
  top_metric: string
  period_label: string
}

export type AnalyticsEvent =
  | 'page_view'
  | 'set_view'
  | 'item_clip'
  | 'canvas_open'
  | 'canvas_publish'
  | 'search_query'
  | 'follow'
  | 'challenge_view'
  | 'referral_link_click'
  | 'referral_signup'

export interface TrackEventPayload {
  event: AnalyticsEvent
  properties?: Record<string, unknown>
}

export interface PaginatedResponse<T> {
  items: T[]
  next_cursor: string | null
  total?: number
}

export interface APIError {
  detail: string
  status_code?: number
}

// ── Notification Types ──────────────────────────────────────

export type NotificationType = 'follow' | 'like' | 'remix' | 'new_set' | 'earnings' | 'payout' | 'milestone'

export interface NotificationActor {
  id: string
  username: string | null
  avatar_url: string | null
}

export interface Notification {
  id: string
  type: NotificationType
  actor: NotificationActor | null
  entity_id: string | null
  entity_type: 'set' | 'item' | null
  message: string
  is_read: boolean
  created_at: string
}

export interface NotificationListResponse {
  notifications: Notification[]
  unread_count: number
  has_more: boolean
}

export interface UnreadCountResponse {
  count: number
}

export interface MarkReadResponse {
  status: string
  marked_count: number
}