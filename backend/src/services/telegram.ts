import { analyzeReceipt } from "./openai";
import { appendToSheet } from "./googleSheets";
import type { ReceiptData } from "../types";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

export async function sendTelegramNotification(receiptData: ReceiptData, botToken: string, chatId: string): Promise<boolean> {
  if (!botToken || !chatId) {
    console.warn("Telegram credentials not provided, skipping notification");
    return false;
  }

  const itemsList = receiptData.items
    .map((item) => `  • ${item.name} x${item.quantity} = ฿${item.price}`)
    .join("\n");

  const message =
    `🧾 *ใบเสร็จใหม่!*\n\n` +
    `🏪 ร้าน: ${escapeMarkdown(receiptData.storeName)}\n` +
    `📅 วันที่: ${escapeMarkdown(receiptData.date)}\n\n` +
    `📋 รายการ:\n${escapeMarkdown(itemsList)}\n\n` +
    `💰 รวม: ฿${receiptData.total}`;

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown" }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Telegram API error: ${response.status} - ${errorBody}`);
  }

  return true;
}

export async function handleTelegramWebhook(update: any): Promise<void> {
  const message = update.message;
  if (!message) return;

  const chatId = message.chat.id;

  if (message.text === "/start") {
    await sendTelegramMessage(chatId,
      "👋 สวัสดี! ส่งรูปใบเสร็จมาได้เลย แล้วผมจะวิเคราะห์ให้\n\n" +
      "📸 รองรับรูป JPG, PNG, WEBP\n" +
      `🆔 Chat ID ของคุณ: \`${chatId}\``
    );
    return;
  }

  if (!message.photo && !message.document) {
    await sendTelegramMessage(chatId, "📸 กรุณาส่งรูปใบเสร็จมาให้ผมวิเคราะห์ (รองรับ JPG, PNG, WEBP)");
    return;
  }

  await sendTelegramMessage(chatId, "⏳ กำลังวิเคราะห์ใบเสร็จ...");

  try {
    let fileId: string;
    if (message.photo) {
      fileId = message.photo[message.photo.length - 1].file_id;
    } else {
      const mime = message.document.mime_type || "";
      if (!mime.startsWith("image/")) {
        await sendTelegramMessage(chatId, "❌ รองรับเฉพาะไฟล์รูปภาพเท่านั้น");
        return;
      }
      fileId = message.document.file_id;
    }

    const fileInfo = await getTelegramFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;

    const imageResponse = await fetch(fileUrl);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const base64Image = imageBuffer.toString("base64");
    const mimeType = getMimeType(fileInfo.file_path);

    const receiptData = await analyzeReceipt(base64Image, mimeType);

    let sheetSaved = false;
    try {
      const sheetId = process.env.GOOGLE_SHEETS_ID;
      if (sheetId) {
        await appendToSheet(receiptData, sheetId);
        sheetSaved = true;
      }
    } catch (err) {
      console.error("Google Sheets error (Telegram):", err);
    }

    const itemsList = receiptData.items
      .map((item) => `  • ${item.name} x${item.quantity} = ฿${item.price}`)
      .join("\n");

    let replyMessage =
      `✅ *วิเคราะห์สำเร็จ!*\n\n` +
      `🏪 ร้าน: ${escapeMarkdown(receiptData.storeName)}\n` +
      `📅 วันที่: ${escapeMarkdown(receiptData.date)}\n\n` +
      `📋 รายการ:\n${escapeMarkdown(itemsList)}\n\n` +
      `💰 รวม: ฿${receiptData.total}\n\n`;

    replyMessage += sheetSaved
      ? "📊 บันทึกลง Google Sheets แล้ว ✓"
      : "⚠️ ไม่สามารถบันทึกลง Google Sheets ได้";

    await sendTelegramMessage(chatId, replyMessage);
  } catch (error) {
    console.error("Telegram receipt processing error:", error);
    await sendTelegramMessage(chatId, "❌ ไม่สามารถวิเคราะห์ใบเสร็จได้ กรุณาตรวจสอบว่ารูปชัดเจนและเป็นใบเสร็จจริง");
  }
}

async function sendTelegramMessage(chatId: number | string, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}

async function getTelegramFile(fileId: string): Promise<{ file_path: string }> {
  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`
  );
  const data = await response.json() as { ok: boolean; result: { file_path: string } };
  if (!data.ok) {
    throw new Error(`Telegram getFile error: ${JSON.stringify(data)}`);
  }
  return data.result;
}

function getMimeType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return mimeMap[ext] || "image/jpeg";
}

function escapeMarkdown(text: string): string {
  if (!text) return "";
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
}
