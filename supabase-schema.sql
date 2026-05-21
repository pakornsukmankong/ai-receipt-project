-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_sheet_id TEXT DEFAULT '',
  line_channel_access_token TEXT DEFAULT '',
  line_user_id TEXT DEFAULT '',
  telegram_bot_token TEXT DEFAULT '',
  telegram_chat_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own settings
CREATE POLICY "Users can read own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own settings
CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own settings
CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ─── Upload Usage Table ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS upload_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast monthly usage queries
CREATE INDEX idx_upload_usage_user_month
  ON upload_usage (user_id, uploaded_at);

-- Enable Row Level Security
ALTER TABLE upload_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own usage
CREATE POLICY "Users can read own upload usage"
  ON upload_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own usage (via service role from backend)
CREATE POLICY "Service role can insert upload usage"
  ON upload_usage FOR INSERT
  WITH CHECK (true);

-- ─── Top-up Transactions Table ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS topup_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent TEXT,
  amount_satang INTEGER NOT NULL,
  quota_added INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_topup_user ON topup_transactions (user_id);
CREATE INDEX idx_topup_session ON topup_transactions (stripe_session_id);

ALTER TABLE topup_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions"
  ON topup_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage transactions"
  ON topup_transactions FOR ALL
  USING (true);

-- ─── Add bonus_quota to user_settings ────────────────────────────────

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS bonus_quota INTEGER DEFAULT 0;
