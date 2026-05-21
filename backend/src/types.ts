import type { Request } from "express";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

export interface ReceiptData {
  storeName: string;
  date: string;
  items: ReceiptItem[];
  total: number;
}

export interface UserSettingsRow {
  id: string;
  user_id: string;
  google_sheet_id: string;
  line_channel_access_token: string;
  line_user_id: string;
  telegram_bot_token: string;
  telegram_chat_id: string;
  bonus_quota: number;
  created_at: string;
  updated_at: string;
}

export interface UserSettingsInput {
  googleSheetId: string;
  lineChannelAccessToken: string;
  lineUserId: string;
  telegramBotToken: string;
  telegramChatId: string;
}

export interface UsageResult {
  isAllowed: boolean;
  currentUsage: number;
  limit: number;
  freeLimit: number;
  bonusQuota: number;
  remaining: number;
}

export interface TopUpPackage {
  id: string;
  quota: number;
  priceThb: number;
  priceSatang: number;
  label: string;
}

export interface WebhookResult {
  processed: boolean;
  reason?: string;
  userId?: string;
  quotaAdded?: number;
}
