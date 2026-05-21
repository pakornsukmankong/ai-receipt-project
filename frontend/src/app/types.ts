// ─── API Response Types ──────────────────────────────────────────────

export interface UsageData {
  currentUsage: number;
  limit: number;
  freeLimit: number;
  bonusQuota: number;
  remaining: number;
  isAllowed: boolean;
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

export interface ServicesStatus {
  sheetSaved: boolean;
  lineSent: boolean;
  telegramSent: boolean;
}

export interface WarningItem {
  code: string;
  message: string;
}

export interface TopUpPackage {
  id: string;
  quota: number;
  priceThb: number;
  label: string;
  pricePerScan: number;
}

export interface UserSettings {
  googleSheetId: string;
  lineChannelAccessToken: string;
  lineUserId: string;
  telegramBotToken: string;
  telegramChatId: string;
}
