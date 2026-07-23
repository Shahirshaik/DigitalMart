export type AccountRole    = "user" | "admin";
export type UserCategory   = "student" | "experienced_professional" | "career_gap";
export type SkillLevel     = "beginner" | "intermediate" | "advanced";
export type LearningFormat = "self_paced" | "live_mentorship" | "guided_path";

export type DeliveryMethod = "auto_key" | "manual_delivery" | "download_link";
export type ListingStatus  = "draft" | "pending" | "active" | "sold_out" | "rejected" | "expired";

export type CourseStatus = "draft" | "pending" | "active" | "archived";
export type VideoSource  = "upload" | "embed";

export type OrderItemType = "listing" | "course";
export type EscrowStatus  = "pending_payment" | "held" | "confirmed" | "disputed" | "released" | "refunded" | "cancelled";
export type DisputeStatus = "open" | "under_review" | "resolved_buyer" | "resolved_seller";

export type SellerBadgeType = "verified_id" | "top_seller" | "fast_responder";
export type LeadStatus      = "new" | "contacted" | "converted";

export type ViolationType   = "phone" | "email" | "external_link" | "social_handle";
export type ViolationAction = "warning" | "mute" | "suspension";

export type WalletTxnType    = "earned" | "redeemed_purchase" | "withdrawn";
export type ReviewTargetType = "listing" | "course" | "seller";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: AccountRole;
  is_seller: boolean;
  seller_verified_at: string | null;
  avatar_url: string | null;
  bio: string | null;
  category: UserCategory | null;
  skill_level: SkillLevel | null;
  target_field: string | null;
  preferred_format: LearningFormat | null;
  onboarding_completed_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListingCategory {
  id: string;
  slug: string;
  name: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

export interface Listing {
  id: string;
  seller_id: string;
  category_id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  delivery_method: DeliveryMethod;
  download_url: string | null;
  stock_count: number | null;
  resale_restricted: boolean;
  images: string[] | null;
  status: ListingStatus;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  thumbnail_url: string | null;
  video_source: VideoSource;
  status: CourseStatus;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  sort_order: number;
}

export interface CourseLesson {
  id: string;
  module_id: string;
  title: string;
  video_url: string | null;
  duration_seconds: number | null;
  sort_order: number;
}

export interface Enrollment {
  id: string;
  course_id: string;
  buyer_id: string;
  progress_pct: number;
  completed_at: string | null;
  certificate_issued_at: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  item_type: OrderItemType;
  listing_id: string | null;
  course_id: string | null;
  amount: number;
  currency: string;
  platform_fee_pct: number;
  status: EscrowStatus;
  payment_reference: string | null;
  paid_at: string | null;
  confirm_deadline: string | null;
  confirmed_at: string | null;
  released_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Dispute {
  id: string;
  order_id: string;
  opened_by: string;
  reason: string;
  evidence: Record<string, unknown> | null;
  status: DisputeStatus;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string | null;
  course_id: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  is_flagged: boolean;
  flagged_reason: ViolationType | null;
  created_at: string;
}

export interface Lead {
  id: string;
  seller_id: string;
  buyer_id: string;
  course_id: string | null;
  conversation_id: string | null;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  order_id: string;
  reviewer_id: string;
  target_type: ReviewTargetType;
  target_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface SellerBadge {
  id: string;
  seller_id: string;
  badge: SellerBadgeType;
  awarded_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  created_at: string;
}

export interface Wallet {
  user_id: string;
  balance_credits: number;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: WalletTxnType;
  amount: number;
  related_referral_id: string | null;
  related_order_id: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string;
  is_read: boolean;
  link_type: string | null;
  link_id: string | null;
  created_at: string;
}

// Joined types
export interface ListingFull extends Listing {
  category?: ListingCategory | null;
  seller?: User | null;
}

export interface CourseFull extends Course {
  seller?: User | null;
  modules?: (CourseModule & { lessons?: CourseLesson[] })[];
}
