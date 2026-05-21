import { createClient } from "@supabase/supabase-js";
import type { UsageResult } from "../types";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const FREE_TIER_LIMIT = 10;

async function getMonthlyUsage(userId: string): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

  const { data, error } = await supabase
    .from("upload_usage")
    .select("id")
    .eq("user_id", userId)
    .gte("uploaded_at", startOfMonth)
    .lte("uploaded_at", endOfMonth);

  if (error) {
    throw new Error(`Failed to fetch upload usage: ${error.message}`);
  }

  return data ? data.length : 0;
}

async function getBonusQuota(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("bonus_quota")
    .eq("user_id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    return 0;
  }

  if (error) {
    throw new Error(`Failed to fetch bonus quota: ${error.message}`);
  }

  return data?.bonus_quota || 0;
}

export async function canUpload(userId: string): Promise<UsageResult> {
  const [usage, bonusQuota] = await Promise.all([
    getMonthlyUsage(userId),
    getBonusQuota(userId),
  ]);

  const totalLimit = FREE_TIER_LIMIT + bonusQuota;

  return {
    isAllowed: usage < totalLimit,
    currentUsage: usage,
    limit: totalLimit,
    freeLimit: FREE_TIER_LIMIT,
    bonusQuota,
    remaining: Math.max(0, totalLimit - usage),
  };
}

export async function recordUpload(userId: string) {
  const { data, error } = await supabase
    .from("upload_usage")
    .insert({ user_id: userId })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record upload: ${error.message}`);
  }

  return data;
}
