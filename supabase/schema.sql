-- ============================================================
--  Digital Mart — Supabase PostgreSQL Schema
--  Version : 1.0.0 (Foundation)
--  Covers all 11 MVP modules from Digital_Mart_MVP_Deck.pptx
--  Run this entire file in: Supabase → SQL Editor → New Query
-- ============================================================


-- ============================================================
-- SECTION 0 : EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";       -- uuid_generate_v4()


-- ============================================================
-- SECTION 1 : ENUM TYPES
-- ============================================================

CREATE TYPE account_role        AS ENUM ('user','admin');
CREATE TYPE user_category       AS ENUM ('student','experienced_professional','career_gap');
CREATE TYPE skill_level         AS ENUM ('beginner','intermediate','advanced');
CREATE TYPE learning_format     AS ENUM ('self_paced','live_mentorship','guided_path');

CREATE TYPE delivery_method     AS ENUM ('auto_key','manual_delivery','download_link');
CREATE TYPE listing_status      AS ENUM ('draft','pending','active','sold_out','rejected','expired');

CREATE TYPE course_status       AS ENUM ('draft','pending','active','archived');
CREATE TYPE video_source        AS ENUM ('upload','embed');

CREATE TYPE order_item_type     AS ENUM ('listing','course');
CREATE TYPE escrow_status       AS ENUM ('pending_payment','held','confirmed','disputed','released','refunded','cancelled');
CREATE TYPE dispute_status      AS ENUM ('open','under_review','resolved_buyer','resolved_seller');

CREATE TYPE seller_badge        AS ENUM ('verified_id','top_seller','fast_responder');
CREATE TYPE lead_status         AS ENUM ('new','contacted','converted');

CREATE TYPE violation_type      AS ENUM ('phone','email','external_link','social_handle');
CREATE TYPE violation_action    AS ENUM ('warning','mute','suspension');

CREATE TYPE wallet_txn_type     AS ENUM ('earned','redeemed_purchase','withdrawn');
CREATE TYPE review_target_type  AS ENUM ('listing','course','seller');


-- ============================================================
-- SECTION 2 : CORE TABLES
-- ============================================================

-- ── 2.1  USERS  (module 3 + 4.1: one account, two roles) ───
CREATE TABLE users (
  id                  UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email               TEXT NOT NULL,
  full_name           TEXT,
  phone               TEXT,
  whatsapp_enabled    BOOLEAN NOT NULL DEFAULT TRUE,              -- seller opt-out of the WhatsApp contact button
  role                account_role NOT NULL DEFAULT 'user',      -- 'admin' = moderator/admin panel access
  is_seller           BOOLEAN NOT NULL DEFAULT FALSE,             -- buyer & seller coexist on one account
  seller_verified_at  TIMESTAMPTZ,                                -- required before payout eligibility
  payout_upi_id       TEXT,                                       -- where the admin manually forwards this seller's cut (see 2.6 ORDERS)
  avatar_url          TEXT,
  bio                 TEXT,

  -- Onboarding categorization (module 4.1) — drives recommendations, never restricts access
  category            user_category,
  skill_level         skill_level,
  target_field        TEXT,
  preferred_format    learning_format,
  onboarding_completed_at TIMESTAMPTZ,

  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2.2  LISTING CATEGORIES (module 4.2) ────────────────────
CREATE TABLE listing_categories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  icon          TEXT NOT NULL DEFAULT 'ti-tag',
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO listing_categories (slug, name, icon, sort_order) VALUES
  ('os_licenses',            'OS Licenses',                  'ti-device-desktop', 1),
  ('productivity_software',  'Productivity Software',        'ti-apps',           2),
  ('design_dev_tools',       'Design & Dev Tools',            'ti-code',           3),
  ('subscriptions',          'Subscriptions',                 'ti-refresh',        4),
  ('guides_ebooks',          'Guides & eBooks',                'ti-book',           5);

-- ── 2.3  LISTINGS — digital goods (module 4.2) ──────────────
CREATE TABLE listings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id             UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  category_id           UUID NOT NULL REFERENCES listing_categories (id) ON DELETE RESTRICT,
  title                 TEXT NOT NULL,
  description           TEXT,
  price                 NUMERIC(12, 2) NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'INR',
  delivery_method        delivery_method NOT NULL DEFAULT 'manual_delivery',
  download_url          TEXT,                                  -- used when delivery_method = 'download_link'
  stock_count           INTEGER,                                -- NULL = unlimited (manual/download); tracked for auto_key
  resale_restricted     BOOLEAN NOT NULL DEFAULT FALSE,          -- shows legal disclaimer before checkout when TRUE
  images                TEXT[],
  status                listing_status NOT NULL DEFAULT 'pending',
  view_count            INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_listings_seller   ON listings (seller_id);
CREATE INDEX idx_listings_category ON listings (category_id);
CREATE INDEX idx_listings_status   ON listings (status);
CREATE INDEX idx_listings_search   ON listings USING GIN (to_tsvector('english', title || ' ' || COALESCE(description,'')));

-- ── 2.4  LISTING KEYS — per-unit stock for auto-delivered keys ─
CREATE TABLE listing_keys (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id        UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  key_value         TEXT NOT NULL,      -- store app-layer encrypted; see NFR: Encrypted key storage
  is_delivered      BOOLEAN NOT NULL DEFAULT FALSE,
  delivered_order_id UUID,               -- FK added after orders table exists
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_listing_keys_listing    ON listing_keys (listing_id) WHERE NOT is_delivered;

-- ── 2.5  COURSES (module 4.3) ───────────────────────────────
CREATE TABLE courses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id       UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  price           NUMERIC(12, 2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'INR',
  thumbnail_url   TEXT,
  video_source    video_source NOT NULL DEFAULT 'embed',   -- upload costs more to host; embed is the MVP cost-saver
  status          course_status NOT NULL DEFAULT 'pending',
  view_count      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_courses_seller ON courses (seller_id);
CREATE INDEX idx_courses_status ON courses (status);
CREATE INDEX idx_courses_search ON courses USING GIN (to_tsvector('english', title || ' ' || COALESCE(description,'')));

CREATE TABLE course_modules (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id     UUID NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE course_lessons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id       UUID NOT NULL REFERENCES course_modules (id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  video_url       TEXT,
  duration_seconds INTEGER,
  sort_order      SMALLINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_course_modules_course ON course_modules (course_id);
CREATE INDEX idx_course_lessons_module ON course_lessons (module_id);

CREATE TABLE enrollments (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id             UUID NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  buyer_id              UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  progress_pct          NUMERIC(5, 2) NOT NULL DEFAULT 0,
  completed_at          TIMESTAMPTZ,
  certificate_issued_at TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, buyer_id)
);

CREATE TABLE lesson_progress (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id   UUID NOT NULL REFERENCES enrollments (id) ON DELETE CASCADE,
  lesson_id       UUID NOT NULL REFERENCES course_lessons (id) ON DELETE CASCADE,
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (enrollment_id, lesson_id)
);

CREATE INDEX idx_enrollments_buyer  ON enrollments (buyer_id);
CREATE INDEX idx_enrollments_course ON enrollments (course_id);

-- ── 2.6  ORDERS — escrow payment & payout (module 4.4) ──────
CREATE TABLE orders (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id           UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  seller_id          UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  item_type          order_item_type NOT NULL,
  listing_id         UUID REFERENCES listings (id) ON DELETE RESTRICT,
  course_id          UUID REFERENCES courses (id) ON DELETE RESTRICT,
  amount             NUMERIC(12, 2) NOT NULL,
  currency           TEXT NOT NULL DEFAULT 'INR',
  platform_fee_pct   NUMERIC(5, 2) NOT NULL DEFAULT 30.00,   -- configurable per category; 70/30 default split
  status             escrow_status NOT NULL DEFAULT 'pending_payment',
  payment_reference  TEXT,                                    -- gateway (Razorpay Route / Stripe Connect) txn id
  paid_at            TIMESTAMPTZ,
  confirm_deadline   TIMESTAMPTZ,                              -- defaults to paid_at + 5 days on payment
  confirmed_at       TIMESTAMPTZ,
  released_at        TIMESTAMPTZ,
  -- Manual settlement model: every buyer pays into ONE fixed collection UPI
  -- ID (NEXT_PUBLIC_UPI_ID), not the seller's own account. On release, the
  -- seller's net-of-fee share is credited to wallet_transactions/wallets
  -- (see set_order_escrow_timestamps) and this flags that it already
  -- happened, so a retriggered UPDATE never double-credits the wallet.
  -- Sellers withdraw from their wallet balance whenever they choose — see
  -- v_admin_withdrawal_queue and wallet_transactions.fulfilled_at.
  wallet_credited_at TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ( (item_type = 'listing' AND listing_id IS NOT NULL AND course_id IS NULL)
       OR (item_type = 'course'  AND course_id  IS NOT NULL AND listing_id IS NULL) )
);

CREATE INDEX idx_orders_buyer   ON orders (buyer_id);
CREATE INDEX idx_orders_seller  ON orders (seller_id);
CREATE INDEX idx_orders_status  ON orders (status);
CREATE INDEX idx_orders_deadline ON orders (confirm_deadline) WHERE status = 'held';

ALTER TABLE listing_keys
  ADD CONSTRAINT fk_listing_keys_order FOREIGN KEY (delivered_order_id) REFERENCES orders (id) ON DELETE SET NULL;

-- ── 2.7  DISPUTES ────────────────────────────────────────────
CREATE TABLE disputes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL UNIQUE REFERENCES orders (id) ON DELETE CASCADE,
  opened_by       UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  reason          TEXT NOT NULL,
  evidence        JSONB,                                    -- chat log refs, delivery proof, screenshots
  status          dispute_status NOT NULL DEFAULT 'open',
  resolved_by     UUID REFERENCES users (id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX idx_disputes_status ON disputes (status);

-- ── 2.8  MESSAGING & ANTI-CIRCUMVENTION (module 4.5) ────────
CREATE TABLE conversations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  seller_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  listing_id    UUID REFERENCES listings (id) ON DELETE SET NULL,
  course_id     UUID REFERENCES courses (id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (buyer_id, seller_id, listing_id, course_id)
);

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body            TEXT NOT NULL,           -- retained in full for dispute evidence, even if flagged
  is_flagged      BOOLEAN NOT NULL DEFAULT FALSE,
  flagged_reason  violation_type,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at);

CREATE TABLE contact_violations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  message_id      UUID REFERENCES messages (id) ON DELETE SET NULL,
  violation_type  violation_type NOT NULL,
  action_taken    violation_action NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_violations_user ON contact_violations (user_id);

-- ── 2.9  LEADS — CRM-lite for sellers (module 4.6) ──────────
CREATE TABLE leads (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  buyer_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  course_id     UUID REFERENCES courses (id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations (id) ON DELETE SET NULL,
  status        lead_status NOT NULL DEFAULT 'new',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_seller ON leads (seller_id, status);
-- One lead per buyer/seller/course combo — repeat WhatsApp clicks upsert
-- (bump updated_at) instead of piling up duplicate rows.
ALTER TABLE leads ADD CONSTRAINT leads_unique_interest UNIQUE (seller_id, buyer_id, course_id);

-- ── 2.10  RECOMMENDATION ENGINE — v1 rules-based (module 4.7) ─
CREATE TABLE recommendation_paths (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category      user_category NOT NULL,
  target_field  TEXT NOT NULL,
  skill_level   skill_level NOT NULL,
  path_items    JSONB NOT NULL,   -- ordered [{ "type": "course"|"guide", "id": "<uuid>", "order": 1 }, ...]
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category, target_field, skill_level)
);

-- ── 2.11  RATINGS & TRUST SIGNALS (module 4.8) ──────────────
CREATE TABLE reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,   -- unlocked only after confirmed order
  reviewer_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  target_type     review_target_type NOT NULL,
  target_id       UUID NOT NULL,    -- listing_id / course_id / seller (user) id depending on target_type
  rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, reviewer_id, target_type)
);

CREATE INDEX idx_reviews_target ON reviews (target_type, target_id);

CREATE TABLE seller_badges (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  badge         seller_badge NOT NULL,
  awarded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (seller_id, badge)
);

-- ── 2.12  REFERRAL PROGRAM & WALLET (module 4.11) ───────────
CREATE TABLE referrals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  referred_id     UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,   -- one referrer per new account
  referral_code   TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wallets (
  user_id           UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  balance_credits   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wallet_transactions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type                wallet_txn_type NOT NULL,
  amount              NUMERIC(12, 2) NOT NULL,     -- positive for earned, negative for redeemed/withdrawn
  related_referral_id UUID REFERENCES referrals (id) ON DELETE SET NULL,
  related_order_id    UUID REFERENCES orders (id) ON DELETE SET NULL,
  -- For type='withdrawn' rows only: set when admin manually sends the money
  -- and marks the request fulfilled. NULL = pending in v_admin_withdrawal_queue.
  fulfilled_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_txn_user ON wallet_transactions (user_id);

-- ── 2.13  NOTIFICATIONS (module 4.10) ───────────────────────
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  body          TEXT,
  type          TEXT NOT NULL DEFAULT 'info',   -- purchase_confirmation, delivery_received, confirm_closing,
                                                  -- dispute_update, payout_released, course_progress,
                                                  -- admin_purchase_activity (sent to every admin — see
                                                  -- set_order_escrow_timestamps, notify_admin_order_created,
                                                  -- notify_withdrawal_requested, notify_dispute_opened)
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  link_type     TEXT,
  link_id       UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_user ON notifications (user_id, is_read);


-- ============================================================
-- SECTION 3 : TRIGGERS & FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone'
  );
  INSERT INTO public.wallets (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- NOTE for anyone seeding auth.users directly (not via supabase.auth.signUp):
-- GoTrue's Go scanner expects confirmation_token, recovery_token, email_change,
-- email_change_token_new, email_change_token_current, phone_change,
-- phone_change_token, and reauthentication_token to be '' — NOT NULL. A NULL
-- in any of them makes every future login for that row fail with a 500
-- "Database error querying schema" (sql.Scan can't put NULL into a string).

-- Trigger-only function — not meant to be called via the PostgREST RPC API
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_users_updated    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_listings_updated BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_courses_updated  BEFORE UPDATE ON courses  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_orders_updated   BEFORE UPDATE ON orders   FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_leads_updated    BEFORE UPDATE ON leads    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Escrow flow timestamps: paid -> held, sets the 5-day confirm deadline.
-- Also emits in-app notifications to the other party AND to every admin
-- (module 4.10 purchase-activity visibility — the operator wants to know
-- the moment any buyer/seller performs a purchase action so they can chase
-- it down manually, since there's no WhatsApp Business API yet to push
-- outbound messages). On release, credits the seller's wallet with their
-- net-of-platform-fee share (see wallets/wallet_transactions, Section 2.12)
-- — this is the pooled-UPI-collection model: buyers never pay the seller
-- directly, so "released" money has to land somewhere the seller can
-- request a withdrawal from. SECURITY DEFINER because none of buyer/
-- seller/admin has an RLS grant to insert rows for someone else (see
-- notif_own policy and wallet_txn_redeem_own, Section 4).
CREATE OR REPLACE FUNCTION set_order_escrow_timestamps()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item_title TEXT;
  v_net_amount NUMERIC;
BEGIN
  IF NEW.status = 'held' AND OLD.status = 'pending_payment' THEN
    NEW.paid_at := NOW();
    NEW.confirm_deadline := NOW() + INTERVAL '5 days';

    SELECT title INTO v_item_title FROM listings WHERE id = NEW.listing_id;
    IF v_item_title IS NULL THEN
      SELECT title INTO v_item_title FROM courses WHERE id = NEW.course_id;
    END IF;

    INSERT INTO notifications (user_id, title, body, type, link_type, link_id)
    VALUES (NEW.seller_id, 'New order awaiting confirmation',
            COALESCE(v_item_title, 'An order') || ' — buyer marked payment as sent.',
            'purchase_confirmation', 'order', NEW.id);

    INSERT INTO notifications (user_id, title, body, type, link_type, link_id)
    SELECT u.id, 'Buyer marked an order paid',
           COALESCE(v_item_title, 'An order') || ' (₹' || NEW.amount || ') — confirm the UPI collection arrived.',
           'admin_purchase_activity', 'order', NEW.id
    FROM users u WHERE u.role = 'admin';
  END IF;

  IF NEW.status = 'confirmed' AND OLD.status = 'held' THEN
    NEW.confirmed_at := NOW();
  END IF;

  IF NEW.status = 'released' AND OLD.status IN ('confirmed','disputed') THEN
    NEW.released_at := NOW();

    SELECT title INTO v_item_title FROM listings WHERE id = NEW.listing_id;
    IF v_item_title IS NULL THEN
      SELECT title INTO v_item_title FROM courses WHERE id = NEW.course_id;
    END IF;

    INSERT INTO notifications (user_id, title, body, type, link_type, link_id)
    VALUES (NEW.buyer_id, 'Order delivered',
            COALESCE(v_item_title, 'Your order') || ' has been confirmed and released to you.',
            'delivery_received', 'order', NEW.id);

    IF NEW.wallet_credited_at IS NULL THEN
      v_net_amount := ROUND(NEW.amount * (100 - NEW.platform_fee_pct) / 100, 2);
      NEW.wallet_credited_at := NOW();

      INSERT INTO wallet_transactions (user_id, type, amount, related_order_id)
      VALUES (NEW.seller_id, 'earned', v_net_amount, NEW.id);

      INSERT INTO notifications (user_id, title, body, type, link_type, link_id)
      VALUES (NEW.seller_id, 'Earnings added to your wallet',
              '₹' || v_net_amount || ' for ' || COALESCE(v_item_title, 'an order') || ' (after platform fee) is now in your wallet. Request a withdrawal any time.',
              'payout_released', 'order', NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_escrow_timestamps
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_order_escrow_timestamps();

-- Notify the other order party AND every admin when a dispute is opened
-- (admin mediates every dispute directly — see checkout page WhatsApp bridge).
CREATE OR REPLACE FUNCTION notify_dispute_opened()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order RECORD;
  v_other_party UUID;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = NEW.order_id;
  v_other_party := CASE WHEN NEW.opened_by = v_order.buyer_id THEN v_order.seller_id ELSE v_order.buyer_id END;

  INSERT INTO notifications (user_id, title, body, type, link_type, link_id)
  VALUES (v_other_party, 'A dispute was raised on your order', NEW.reason, 'dispute_update', 'order', NEW.order_id);

  INSERT INTO notifications (user_id, title, body, type, link_type, link_id)
  SELECT u.id, 'Dispute opened — needs mediation', NEW.reason, 'admin_purchase_activity', 'order', NEW.order_id
  FROM users u WHERE u.role = 'admin';

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dispute_notify
  AFTER INSERT ON disputes
  FOR EACH ROW EXECUTE FUNCTION notify_dispute_opened();

-- Notify every admin the moment any order is first created (pending_payment)
-- — the operator wants visibility into every purchase action, not just paid
-- ones, since they personally follow up over WhatsApp.
CREATE OR REPLACE FUNCTION notify_admin_order_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item_title TEXT;
BEGIN
  SELECT title INTO v_item_title FROM listings WHERE id = NEW.listing_id;
  IF v_item_title IS NULL THEN
    SELECT title INTO v_item_title FROM courses WHERE id = NEW.course_id;
  END IF;

  INSERT INTO notifications (user_id, title, body, type, link_type, link_id)
  SELECT u.id, 'New order started',
         COALESCE(v_item_title, 'An order') || ' (₹' || NEW.amount || ') — buyer is checking out.',
         'admin_purchase_activity', 'order', NEW.id
  FROM users u WHERE u.role = 'admin';

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admin_order_created
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION notify_admin_order_created();

-- Notify every admin when a seller requests a wallet withdrawal, so the
-- operator can manually send the money and mark it fulfilled (see
-- wallet_transactions.fulfilled_at, v_admin_withdrawal_queue, module 4.11).
CREATE OR REPLACE FUNCTION notify_withdrawal_requested()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_seller_name TEXT;
BEGIN
  IF NEW.type = 'withdrawn' THEN
    SELECT full_name INTO v_seller_name FROM users WHERE id = NEW.user_id;

    INSERT INTO notifications (user_id, title, body, type, link_type, link_id)
    SELECT u.id, 'Withdrawal requested',
           COALESCE(v_seller_name, 'A seller') || ' requested a withdrawal of ₹' || ABS(NEW.amount) || '. Send payment and mark it fulfilled.',
           'admin_purchase_activity', 'wallet', NULL
    FROM users u WHERE u.role = 'admin';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_withdrawal_requested
  AFTER INSERT ON wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION notify_withdrawal_requested();

-- Referral credit: 10% of a referred user's purchase, credited on confirmation.
-- SECURITY DEFINER — without it, this INSERT into wallet_transactions (a
-- table the confirming seller/buyer has no RLS grant on) would raise a
-- permission-denied error and abort the whole order-confirmation transaction
-- the moment a referred user's order gets confirmed.
CREATE OR REPLACE FUNCTION credit_referral_on_confirm()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_referral RECORD;
  v_credit   NUMERIC(12,2);
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status = 'held' THEN
    SELECT * INTO v_referral FROM referrals WHERE referred_id = NEW.buyer_id;
    IF FOUND THEN
      v_credit := ROUND(NEW.amount * 0.10, 2);
      INSERT INTO wallet_transactions (user_id, type, amount, related_referral_id, related_order_id)
      VALUES (v_referral.referrer_id, 'earned', v_credit, v_referral.id, NEW.id);

      INSERT INTO notifications (user_id, title, body, type, link_type, link_id)
      VALUES (v_referral.referrer_id, 'Referral credit earned',
              'You earned ₹' || v_credit || ' credit from a referred purchase.', 'info', 'wallet', NULL);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_referral_credit
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION credit_referral_on_confirm();

-- Keep wallet balance in sync with its transaction ledger. SECURITY DEFINER —
-- the acting user (whoever the credit was earned by) has no UPDATE grant on
-- wallets (only a SELECT policy on their own row exists).
CREATE OR REPLACE FUNCTION sync_wallet_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE wallets
  SET balance_credits = balance_credits + NEW.amount, updated_at = NOW()
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wallet_txn_sync
  AFTER INSERT ON wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION sync_wallet_balance();

-- Recompute enrollment progress_pct whenever a lesson is completed, and
-- notify the buyer once they cross 100%. No DEFINER needed here — the buyer
-- inserts their own lesson_progress row, so the notification's user_id
-- matches the acting auth.uid() and satisfies notif_own directly.
CREATE OR REPLACE FUNCTION recompute_enrollment_progress()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_course_id     UUID;
  v_course_title  TEXT;
  v_buyer_id      UUID;
  v_total_lessons INTEGER;
  v_done_lessons  INTEGER;
  v_pct           NUMERIC(5,2);
  v_was_completed BOOLEAN;
BEGIN
  SELECT course_id, buyer_id, (completed_at IS NOT NULL)
    INTO v_course_id, v_buyer_id, v_was_completed
  FROM enrollments WHERE id = NEW.enrollment_id;

  SELECT COUNT(*) INTO v_total_lessons
  FROM course_lessons cl JOIN course_modules cm ON cm.id = cl.module_id
  WHERE cm.course_id = v_course_id;

  SELECT COUNT(*) INTO v_done_lessons
  FROM lesson_progress WHERE enrollment_id = NEW.enrollment_id;

  v_pct := CASE WHEN v_total_lessons = 0 THEN 0 ELSE ROUND(100.0 * v_done_lessons / v_total_lessons, 2) END;

  UPDATE enrollments
  SET progress_pct = v_pct,
      completed_at = CASE WHEN v_pct >= 100 THEN NOW() ELSE completed_at END
  WHERE id = NEW.enrollment_id;

  IF v_pct >= 100 AND NOT v_was_completed THEN
    SELECT title INTO v_course_title FROM courses WHERE id = v_course_id;
    INSERT INTO notifications (user_id, title, body, type, link_type, link_id)
    VALUES (v_buyer_id, 'Course completed!',
            'You finished ' || COALESCE(v_course_title, 'the course') || ' — your certificate is ready.',
            'course_progress', 'course', v_course_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lesson_progress
  AFTER INSERT ON lesson_progress
  FOR EACH ROW EXECUTE FUNCTION recompute_enrollment_progress();

-- Auto-release orders whose 5-day confirm window has passed with no dispute.
-- SECURITY DEFINER so it can transition orders it doesn't own; called via
-- RPC from a Vercel Cron-triggered API route using the anon key (no
-- session, no service-role key involved) — see /api/cron/auto-release.
-- Idempotent: each UPDATE is guarded by the current status, so a duplicate
-- or concurrent call is a no-op on rows already processed.
CREATE OR REPLACE FUNCTION auto_release_overdue_orders()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_order IN
    SELECT id, item_type, course_id, buyer_id
    FROM orders
    WHERE status = 'held' AND confirm_deadline IS NOT NULL AND confirm_deadline < NOW()
  LOOP
    UPDATE orders SET status = 'confirmed' WHERE id = v_order.id AND status = 'held';
    UPDATE orders SET status = 'released'  WHERE id = v_order.id AND status = 'confirmed';

    IF v_order.item_type = 'course' AND v_order.course_id IS NOT NULL THEN
      INSERT INTO enrollments (course_id, buyer_id)
      VALUES (v_order.course_id, v_order.buyer_id)
      ON CONFLICT DO NOTHING;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION auto_release_overdue_orders() TO anon, authenticated;

-- Automatically award seller_badges when an order is released, instead of
-- requiring a manual admin action. SECURITY DEFINER because the acting
-- user (buyer confirming, or the cron RPC) has no RLS grant to insert a
-- badge row for the seller.
--
-- top_seller: lifetime earnings (after platform fee) crosses ₹10,000.
-- fast_responder: average time from payment to release across the
-- seller's released orders (minimum 3, so one lucky fast order doesn't
-- qualify them) stays under 48 hours.
CREATE OR REPLACE FUNCTION award_seller_badges()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lifetime_earnings NUMERIC;
  v_released_count INTEGER;
  v_avg_hours NUMERIC;
BEGIN
  IF NEW.status = 'released' AND OLD.status IN ('confirmed', 'disputed') THEN
    SELECT COALESCE(SUM(amount * (100 - platform_fee_pct) / 100), 0)
      INTO v_lifetime_earnings
    FROM orders WHERE seller_id = NEW.seller_id AND status = 'released';

    IF v_lifetime_earnings >= 10000 THEN
      INSERT INTO seller_badges (seller_id, badge) VALUES (NEW.seller_id, 'top_seller')
      ON CONFLICT (seller_id, badge) DO NOTHING;
    END IF;

    SELECT COUNT(*), AVG(EXTRACT(EPOCH FROM (released_at - paid_at)) / 3600)
      INTO v_released_count, v_avg_hours
    FROM orders
    WHERE seller_id = NEW.seller_id AND status = 'released'
      AND paid_at IS NOT NULL AND released_at IS NOT NULL;

    IF v_released_count >= 3 AND v_avg_hours < 48 THEN
      INSERT INTO seller_badges (seller_id, badge) VALUES (NEW.seller_id, 'fast_responder')
      ON CONFLICT (seller_id, badge) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_award_seller_badges
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION award_seller_badges();

-- Locks `role` against self-escalation. Lives here (not in the
-- users_update_own RLS policy) specifically to avoid a same-table
-- subquery inside a users policy — see the policy's comment in Section 4
-- for why that recurses. SECURITY DEFINER so is_admin() resolves correctly
-- regardless of who's updating.
CREATE OR REPLACE FUNCTION prevent_self_role_escalation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT is_admin() THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_self_role_escalation
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION prevent_self_role_escalation();


-- ============================================================
-- SECTION 4 : ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_keys          ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses               ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons        ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress       ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_violations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_paths  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews               ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_badges         ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets                ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications          ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER + callable by anon/authenticated is intentional here: RLS policies on
-- listing_categories, users, etc. call is_admin() inside their own USING clause, so both
-- roles need EXECUTE for those policies to evaluate at all. Do not REVOKE.
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION seller_id_of(p_listing_id UUID) RETURNS UUID LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT seller_id FROM listings WHERE id = p_listing_id;
$$;

-- Users
CREATE POLICY "users_select_own_or_admin" ON users FOR SELECT USING (id = auth.uid() OR is_admin());
CREATE POLICY "users_select_public_seller" ON users FOR SELECT USING (is_seller = TRUE);   -- public seller profiles
-- A seller can see basic profile info for buyers who generated a lead with
-- them (otherwise the leads dashboard join is RLS-filtered to null for any
-- buyer who isn't also a seller).
CREATE POLICY "users_select_lead_buyer" ON users FOR SELECT
  USING (EXISTS (SELECT 1 FROM leads l WHERE l.buyer_id = users.id AND l.seller_id = auth.uid()));
-- WITH CHECK deliberately does NOT subquery `users` (e.g. to lock `role`)
-- — a same-table subquery inside a users policy makes Postgres re-apply
-- users' SELECT policies while evaluating this UPDATE policy, which raises
-- "infinite recursion detected in policy for relation users" on every
-- self-update (this broke becomeSeller() and the profile WhatsApp toggle
-- until caught). The role lock is enforced by a trigger instead, below.
CREATE POLICY "users_update_own" ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
CREATE POLICY "users_admin_all" ON users FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Listing categories
CREATE POLICY "listing_categories_select" ON listing_categories FOR SELECT USING (is_active = TRUE OR is_admin());
CREATE POLICY "listing_categories_admin_all" ON listing_categories FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Listings
CREATE POLICY "listings_public_select" ON listings FOR SELECT USING (status = 'active');
CREATE POLICY "listings_owner_select" ON listings FOR SELECT USING (seller_id = auth.uid());
CREATE POLICY "listings_owner_insert" ON listings FOR INSERT WITH CHECK (seller_id = auth.uid());
CREATE POLICY "listings_owner_update" ON listings FOR UPDATE USING (seller_id = auth.uid());
CREATE POLICY "listings_admin_all" ON listings FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Listing keys — never exposed to buyers directly; delivered via server-side function only
CREATE POLICY "listing_keys_owner" ON listing_keys FOR ALL
  USING (seller_id_of(listing_id) = auth.uid()) WITH CHECK (seller_id_of(listing_id) = auth.uid());
CREATE POLICY "listing_keys_admin_all" ON listing_keys FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Courses
CREATE POLICY "courses_public_select" ON courses FOR SELECT USING (status = 'active');
CREATE POLICY "courses_owner_select" ON courses FOR SELECT USING (seller_id = auth.uid());
CREATE POLICY "courses_owner_insert" ON courses FOR INSERT WITH CHECK (seller_id = auth.uid());
CREATE POLICY "courses_owner_update" ON courses FOR UPDATE USING (seller_id = auth.uid());
CREATE POLICY "courses_admin_all" ON courses FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Course modules / lessons — follow parent course visibility
CREATE POLICY "course_modules_select" ON course_modules FOR SELECT
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND (c.status = 'active' OR c.seller_id = auth.uid())) OR is_admin());
CREATE POLICY "course_modules_owner_write" ON course_modules FOR ALL
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.seller_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.seller_id = auth.uid()));

CREATE POLICY "course_lessons_select" ON course_lessons FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM course_modules cm JOIN courses c ON c.id = cm.course_id
    WHERE cm.id = module_id AND (c.status = 'active' OR c.seller_id = auth.uid())
  ) OR is_admin());
CREATE POLICY "course_lessons_owner_write" ON course_lessons FOR ALL
  USING (EXISTS (SELECT 1 FROM course_modules cm JOIN courses c ON c.id = cm.course_id WHERE cm.id = module_id AND c.seller_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM course_modules cm JOIN courses c ON c.id = cm.course_id WHERE cm.id = module_id AND c.seller_id = auth.uid()));

-- Enrollments
CREATE POLICY "enrollments_buyer_select" ON enrollments FOR SELECT USING (buyer_id = auth.uid());
CREATE POLICY "enrollments_seller_select" ON enrollments FOR SELECT
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.seller_id = auth.uid()));
-- Seller inserts the enrollment row when releasing a course order (confirmAndReleaseOrder runs as the seller)
CREATE POLICY "enrollments_seller_insert" ON enrollments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.seller_id = auth.uid()));
-- Buyer updates their own progress_pct/completed_at/certificate_issued_at as they complete lessons
CREATE POLICY "enrollments_buyer_update" ON enrollments FOR UPDATE
  USING (buyer_id = auth.uid()) WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "enrollments_admin_all" ON enrollments FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Lesson progress
CREATE POLICY "lesson_progress_own" ON lesson_progress FOR ALL
  USING (EXISTS (SELECT 1 FROM enrollments e WHERE e.id = enrollment_id AND e.buyer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM enrollments e WHERE e.id = enrollment_id AND e.buyer_id = auth.uid()));

-- Orders — escrow visible only to its two parties + admin
CREATE POLICY "orders_party_select" ON orders FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR is_admin());
CREATE POLICY "orders_buyer_insert" ON orders FOR INSERT WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "orders_admin_all" ON orders FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Manual UPI flow: buyer marks their own pending order as paid ("I've Paid"),
-- seller marks their own paid order as released after manually confirming
-- receipt in their UPI app. App code enforces the exact status transition;
-- these policies just gate by ownership.
CREATE POLICY "orders_buyer_update_own" ON orders FOR UPDATE
  USING (buyer_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "orders_seller_update_own" ON orders FOR UPDATE
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- Disputes — visible to order parties + admin; only admin resolves
CREATE POLICY "disputes_party_select" ON disputes FOR SELECT
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())) OR is_admin());
CREATE POLICY "disputes_party_insert" ON disputes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())));
CREATE POLICY "disputes_admin_all" ON disputes FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Conversations & messages — participants only
CREATE POLICY "conversations_party" ON conversations FOR ALL
  USING (buyer_id = auth.uid() OR seller_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid());
CREATE POLICY "conversations_admin_select" ON conversations FOR SELECT USING (is_admin());

CREATE POLICY "messages_party_select" ON messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())) OR is_admin());
CREATE POLICY "messages_party_insert" ON messages FOR INSERT
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())));

-- Contact violations — own record + admin
CREATE POLICY "violations_own_select" ON contact_violations FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "violations_admin_all" ON contact_violations FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Leads
CREATE POLICY "leads_seller_all" ON leads FOR ALL USING (seller_id = auth.uid()) WITH CHECK (seller_id = auth.uid());
CREATE POLICY "leads_admin_all" ON leads FOR ALL USING (is_admin()) WITH CHECK (is_admin());
-- Leads are generated by a buyer clicking "Connect on WhatsApp" on a course
-- (in-app messaging was replaced by the WhatsApp contact button, so this
-- is the new entry point instead of a conversation). The buyer inserts
-- their own interest signal; leads_seller_all above only covers rows the
-- seller already owns.
CREATE POLICY "leads_buyer_insert" ON leads FOR INSERT
  WITH CHECK (
    buyer_id = auth.uid()
    AND EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.seller_id = leads.seller_id)
  );

-- Recommendation paths — public read, admin write
CREATE POLICY "recommendation_paths_select" ON recommendation_paths FOR SELECT USING (TRUE);
CREATE POLICY "recommendation_paths_admin_all" ON recommendation_paths FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Reviews — public read; insert only by the confirmed order's buyer
CREATE POLICY "reviews_select_all" ON reviews FOR SELECT USING (TRUE);
CREATE POLICY "reviews_insert_own" ON reviews FOR INSERT
  WITH CHECK (reviewer_id = auth.uid()
    AND EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.buyer_id = auth.uid() AND o.status IN ('confirmed','released')));
CREATE POLICY "reviews_admin_all" ON reviews FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Seller badges — public read, admin write
CREATE POLICY "seller_badges_select" ON seller_badges FOR SELECT USING (TRUE);
CREATE POLICY "seller_badges_admin_all" ON seller_badges FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Referrals
CREATE POLICY "referrals_own_select" ON referrals FOR SELECT USING (referrer_id = auth.uid() OR referred_id = auth.uid() OR is_admin());
CREATE POLICY "referrals_insert" ON referrals FOR INSERT WITH CHECK (referred_id = auth.uid());

-- Wallets
CREATE POLICY "wallets_own_select" ON wallets FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "wallet_txn_own_select" ON wallet_transactions FOR SELECT USING (user_id = auth.uid() OR is_admin());

-- A user can request their own withdrawal (or referral-credit redemption) by
-- inserting a negative ledger row directly — sync_wallet_balance debits the
-- balance, trg_notify_withdrawal_requested alerts admin. amount < 0 stops a
-- user from faking a positive 'earned' row for themselves.
CREATE POLICY "wallet_txn_redeem_own" ON wallet_transactions FOR INSERT
  WITH CHECK (user_id = auth.uid() AND type IN ('redeemed_purchase','withdrawn') AND amount < 0);

-- Admin marks a withdrawal request fulfilled (sets fulfilled_at) after
-- manually sending the money — see v_admin_withdrawal_queue.
CREATE POLICY "wallet_txn_admin_update" ON wallet_transactions FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- Notifications
CREATE POLICY "notif_own" ON notifications FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_admin_insert" ON notifications FOR INSERT WITH CHECK (is_admin());


-- ============================================================
-- SECTION 5 : HELPERS & VIEWS
-- ============================================================

CREATE OR REPLACE VIEW v_listings_full WITH (security_invoker = true) AS
SELECT l.id, l.title, l.price, l.currency, l.delivery_method, l.resale_restricted,
       l.stock_count, l.status, l.view_count, l.created_at,
       c.name AS category, c.slug AS category_slug, c.icon AS category_icon,
       u.full_name AS seller_name, u.id AS seller_id
FROM listings l
JOIN listing_categories c ON c.id = l.category_id
JOIN users u ON u.id = l.seller_id;

-- Seller-facing: pending (still in escrow) + lifetime wallet earnings. The
-- actual withdrawable figure is wallets.balance_credits — this view is
-- informational context around it, not the source of truth for balance.
CREATE OR REPLACE VIEW v_seller_payouts WITH (security_invoker = true) AS
SELECT o.seller_id,
       COUNT(*) FILTER (WHERE o.status = 'held')                                                      AS pending_count,
       COALESCE(SUM(o.amount * (100 - o.platform_fee_pct) / 100) FILTER (WHERE o.status = 'held'), 0) AS pending_amount,
       COUNT(*) FILTER (WHERE o.status = 'disputed')                                                   AS disputed_count,
       COALESCE(SUM(o.amount * (100 - o.platform_fee_pct) / 100) FILTER (WHERE o.status = 'released'), 0) AS lifetime_earnings
FROM orders o
GROUP BY o.seller_id;

-- Admin queue: every pending wallet withdrawal request, with the seller's
-- own UPI ID so the admin knows where to send the money before marking it
-- fulfilled (wallet_transactions.fulfilled_at).
CREATE OR REPLACE VIEW v_admin_withdrawal_queue WITH (security_invoker = true) AS
SELECT wt.id AS request_id, wt.user_id AS seller_id,
       u.full_name AS seller_name, u.payout_upi_id,
       ABS(wt.amount) AS amount, wt.created_at AS requested_at
FROM wallet_transactions wt
JOIN users u ON u.id = wt.user_id
WHERE wt.type = 'withdrawn' AND wt.fulfilled_at IS NULL
ORDER BY wt.created_at ASC;

CREATE OR REPLACE VIEW v_review_stats WITH (security_invoker = true) AS
SELECT target_type, target_id,
       ROUND(AVG(rating)::NUMERIC, 2) AS avg_rating,
       COUNT(*) AS review_count
FROM reviews
GROUP BY target_type, target_id;

-- Aggregate-only public view: exposes enrollment counts without leaking who's enrolled.
-- Deliberately NOT security_invoker — it runs as the view owner so anonymous/authenticated
-- visitors can see the count even though the underlying enrollments rows stay RLS-locked
-- to the buyer/seller/admin.
CREATE OR REPLACE VIEW v_course_enrollment_counts AS
SELECT course_id, COUNT(*) AS enrollment_count
FROM enrollments
GROUP BY course_id;

GRANT SELECT ON v_course_enrollment_counts TO anon, authenticated;

CREATE OR REPLACE VIEW v_admin_dispute_queue WITH (security_invoker = true) AS
SELECT d.id, d.status, d.reason, d.created_at,
       o.id AS order_id, o.amount, o.item_type,
       buyer.full_name AS buyer_name, seller.full_name AS seller_name
FROM disputes d
JOIN orders o ON o.id = d.order_id
JOIN users buyer  ON buyer.id  = o.buyer_id
JOIN users seller ON seller.id = o.seller_id
WHERE d.status IN ('open','under_review')
ORDER BY d.created_at ASC;

-- Category performance for the admin analytics overview: listing counts and
-- released-order revenue per category. security_invoker so it only ever
-- returns what the querying admin already has RLS access to.
CREATE OR REPLACE VIEW v_admin_category_performance WITH (security_invoker = true) AS
SELECT lc.id AS category_id, lc.name AS category_name,
       COUNT(DISTINCT l.id) AS listing_count,
       COUNT(o.id) FILTER (WHERE o.status = 'released') AS order_count,
       COALESCE(SUM(o.amount) FILTER (WHERE o.status = 'released'), 0) AS revenue
FROM listing_categories lc
LEFT JOIN listings l ON l.category_id = lc.id
LEFT JOIN orders o ON o.listing_id = l.id
GROUP BY lc.id, lc.name
ORDER BY revenue DESC;


-- ============================================================
-- SECTION 6 : MAKE YOURSELF ADMIN
-- ============================================================
-- After signing up, run:
-- UPDATE users SET role = 'admin' WHERE id = '<your-uuid>';


-- ============================================================
-- SECTION 7 : REALTIME  (run in Dashboard or uncomment)
-- ============================================================
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
-- ALTER PUBLICATION supabase_realtime ADD TABLE orders;


-- ============================================================
-- SECTION 8 : STORAGE — listing/course image uploads
-- ============================================================
-- Public bucket; files are stored under <auth.uid()>/<filename> so the
-- owner-only insert/update/delete policies below can check the folder name.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do nothing;

create policy "listing_images_public_read" on storage.objects
  for select using (bucket_id = 'listing-images');

create policy "listing_images_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "listing_images_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "listing_images_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
