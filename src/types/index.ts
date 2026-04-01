// ============================================================
// VENTAS EN AUTOMATICO - Type Definitions
// ============================================================

export type UserRole = 'admin' | 'user';

export type ProfileStatus = 'active' | 'suspended' | 'blocked';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  tenant_id: string;
  is_active: boolean;
  last_login_at?: string;
  onboarding_completed?: boolean;
  status?: ProfileStatus;
  country?: string;
  city?: string;
  phone_number?: string;
  country_code?: string;
  phone_with_code?: string;
  transaction_password_hash?: string;
  login_provider?: 'email' | 'google';
  suspended_at?: string;
  suspended_by?: string;
  blocked_at?: string;
  blocked_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  is_active: boolean;
  created_at: string;
}

export type GptModel = 'gpt-5.1' | 'gpt-4.1' | 'gpt-4.1-mini' | 'gpt-4.1-nano' | 'gpt-4o' | 'gpt-4o-mini';

export interface Bot {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  openai_api_key?: string;
  report_phone?: string;
  gpt_model?: GptModel;
  paused_at?: string;
  paused_by?: string;
  created_at: string;
  updated_at: string;
  // Joined
  bot_prompts?: BotPrompt;
  followup_settings?: FollowupSettings;
  whatsapp_sessions?: WhatsappSession;
}

export interface BotPrompt {
  id: string;
  bot_id: string;
  system_prompt: string;
  personality: string;
  sales_rules: string;
  tone: string;
  max_chars_per_message: number;
  max_chars_message1: number;
  max_chars_message2: number;
  max_chars_message3: number;
  strict_json_output: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  bot_id: string;
  tenant_id: string;
  name: string;
  category: string;
  description: string;
  benefits: string;
  usage_instructions: string;
  warnings: string;
  currency: string;
  price_unit: number;
  offer_price?: number | null;
  price_promo_x2?: number;
  price_super_x6?: number;
  shipping_info: string;
  coverage: string;
  sell_zones: string;
  delivery_zones: string;
  hooks: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_images?: ProductImage[];
  product_testimonials?: ProductTestimonial[];
}

export type ProductImageType = 'product' | 'offer';

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
  image_type: ProductImageType;
  created_at: string;
}

export interface ProductTestimonial {
  id: string;
  product_id: string;
  type: 'image' | 'video' | 'text';
  url: string;
  content?: string;
  description?: string;
  created_at: string;
}

export interface FollowupSettings {
  id: string;
  bot_id: string;
  first_followup_minutes: number;
  second_followup_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhatsappSession {
  id: string;
  bot_id: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'qr_ready';
  phone_number?: string;
  qr_code?: string;
  last_connected_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  bot_id: string;
  tenant_id: string;
  phone: string;
  name?: string;
  push_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  bot_id: string;
  contact_id: string;
  status: 'active' | 'closed' | 'pending_followup';
  product_interest?: string;
  last_message_at: string;
  created_at: string;
  contact?: Contact;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: 'bot' | 'client';
  type: 'text' | 'audio' | 'image' | 'location' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface Lead {
  id: string;
  bot_id: string;
  tenant_id: string;
  contact_id: string;
  conversation_id: string;
  status: 'new' | 'interested' | 'negotiating' | 'converted' | 'lost';
  product_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  contact?: Contact;
  product?: Product;
}

export interface Order {
  id: string;
  lead_id: string;
  bot_id: string;
  tenant_id: string;
  contact_id: string;
  product_id: string;
  quantity: number;
  total_amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  shipping_address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  tenant_id: string;
  user_id?: string;
  bot_id?: string;
  action: string;
  details?: Record<string, unknown>;
  created_at: string;
}

// Dashboard metrics
export interface DashboardMetrics {
  total_bots: number;
  active_bots: number;
  total_leads: number;
  total_conversations: number;
  confirmed_orders: number;
  total_users: number;
  recent_conversations: Conversation[];
}

// AI Response format
export interface AIResponse {
  message1: string;
  message2?: string;
  message3?: string;
  photos_message1?: string[];
  report?: string;
}

// Audit logs
export interface AuditLog {
  id: string;
  tenant_id?: string;
  user_id?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
  // Joined fields
  profile?: Pick<Profile, 'full_name' | 'email' | 'role'>;
}

// Admin notes
export interface AdminNote {
  id: string;
  admin_id: string;
  target_user_id?: string;
  target_bot_id?: string;
  note: string;
  created_at: string;
  updated_at: string;
}

// Admin metrics
export interface AdminMetrics {
  total_users: number;
  active_users: number;
  suspended_users: number;
  total_bots: number;
  active_bots: number;
  total_conversations: number;
  total_leads: number;
  total_orders: number;
  total_products: number;
  users_today: number;
  users_this_week: number;
  users_this_month: number;
  recent_users: Profile[];
  // Subscription metrics
  active_subscriptions: number;
  pending_subscriptions: number;
  rejected_subscriptions: number;
  expired_subscriptions: number;
  pending_payments: number;
  total_revenue: number;
  // Activity
  recent_activity: Array<{
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details: Record<string, unknown>;
    created_at: string;
    profile?: { full_name: string; email: string };
  }>;
}

// Plans
export type SubscriptionStatus = 'pending' | 'active' | 'expired' | 'cancelled' | 'rejected';
export type ApprovalStatus = 'pending_review' | 'approved' | 'rejected' | 'suspended';

export interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  max_bots: number;
  max_products: number;
  max_conversations: number;
  max_whatsapp_numbers: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
  stripe_price_id?: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  approval_status: ApprovalStatus;
  start_date?: string;
  end_date?: string;
  payment_provider?: string;
  payment_id?: string;
  admin_notes?: string;
  approved_by?: string;
  approved_at?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  extended_at?: string;
  extended_by?: string;
  plan_changed_at?: string;
  previous_plan_id?: string;
  stripe_customer_id?: string;
  stripe_checkout_session_id?: string;
  created_at: string;
  updated_at: string;
  // Joined
  plan?: Plan;
  profile?: Pick<Profile, 'full_name' | 'email' | 'role'>;
}

export interface Payment {
  id: string;
  user_id: string;
  subscription_id?: string;
  amount: number;
  currency: string;
  payment_method?: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_id?: string;
  payment_proof_url?: string;
  notes?: string;
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  stripe_payment_intent_id?: string;
  stripe_checkout_session_id?: string;
  stripe_customer_id?: string;
  created_at: string;
  // Joined
  profile?: Pick<Profile, 'full_name' | 'email'>;
  subscription?: Pick<Subscription, 'status' | 'approval_status' | 'plan_id'>;
}

// Admin Notifications
export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  target_user_id?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  is_read: boolean;
  created_at: string;
}
