import { createClient } from "@supabase/supabase-js";
import type { UserSettingsRow, UserSettingsInput } from "../types";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getUserSettings(userId: string): Promise<UserSettingsRow | null> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    return null;
  }

  if (error) {
    throw new Error(`Failed to fetch user settings: ${error.message}`);
  }

  return data;
}

export async function upsertUserSettings(userId: string, settings: UserSettingsInput): Promise<UserSettingsRow> {
  const { data, error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        google_sheet_id: settings.googleSheetId || "",
        line_channel_access_token: settings.lineChannelAccessToken || "",
        line_user_id: settings.lineUserId || "",
        telegram_bot_token: settings.telegramBotToken || "",
        telegram_chat_id: settings.telegramChatId || "",
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save user settings: ${error.message}`);
  }

  return data;
}
