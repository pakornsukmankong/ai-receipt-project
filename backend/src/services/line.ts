import crypto from "crypto";
import { analyzeReceipt } from "./openai";
import { appendToSheet } from "./googleSheets";
import type { ReceiptData } from "../types";

export async function sendLineNotification(receiptData: ReceiptData, token: string, userId: string): Promise<boolean> {
  if (!token || !userId) {
    console.warn("LINE credentials not provided, skipping notification");
    return false;
  }

  const itemsList = receiptData.items
    .map((item) => `  • ${item.name} x${item.quantity} = ฿${item.price}`)
    .join("\n");

  const message = `🧾 ใบเสร็จใหม่!\n\n🏪 ร้าน: ${receiptData.storeName}\n📅 วันที่: ${receiptData.date}\n\n📋 รายการ:\n${itemsList}\n\n💰 รวม: ฿${receiptData.total}`;

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: "text", text: message }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LINE API error: ${response.status} - ${errorBody}`);
  }

  return true;
}

export async function handleLineWebhook(body: any, signature: string | undefined): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!token || !channelSecret) {
    console.warn("LINE webhook credentials not configured");
    return;
  }

  const hash = crypto
    .createHmac("SHA256", channelSecret)
    .update(JSON.stringify(body))
    .digest("base64");

  if (hash !== signature) {
    throw new Error("Invalid LINE webhook signature");
  }

  const events = body.events || [];

  for (const event of events) {
    if (event.type === "message") {
      await handleLineMessage(event, token);
    }
  }
}

async function handleLineMessage(event: any, token: string): Promise<void> {
  const replyToken = event.replyToken;
  const message = event.message;

  if (message.type === "image") {
    await replyLineMessage(token, replyToken, [
      { type: "text", text: "⏳ กำลังวิเคราะห์ใบเสร็จ..." },
    ]);

    try {
      const imageBuffer = await getLineImageContent(token, message.id);
      const base64Image = imageBuffer.toString("base64");
      const mimeType = "image/jpeg";

      const receiptData = await analyzeReceipt(base64Image, mimeType);

      let sheetSaved = false;
      try {
        const sheetId = process.env.GOOGLE_SHEETS_ID;
        if (sheetId) {
          await appendToSheet(receiptData, sheetId);
          sheetSaved = true;
        }
      } catch (err) {
        console.error("Google Sheets error (LINE):", err);
      }

      const itemsList = receiptData.items
        .map((item) => `• ${item.name} x${item.quantity} = ฿${item.price}`)
        .join("\n");

      let replyText =
        `✅ วิเคราะห์สำเร็จ!\n\n` +
        `🏪 ร้าน: ${receiptData.storeName}\n` +
        `📅 วันที่: ${receiptData.date}\n\n` +
        `📋 รายการ:\n${itemsList}\n\n` +
        `💰 รวม: ฿${receiptData.total}\n\n`;

      replyText += sheetSaved
        ? "📊 บันทึกลง Google Sheets แล้ว ✓"
        : "⚠️ ไม่สามารถบันทึกลง Google Sheets ได้";

      await pushLineMessage(token, event.source.userId, [
        { type: "text", text: replyText },
      ]);
    } catch (error) {
      console.error("LINE receipt processing error:", error);
      await pushLineMessage(token, event.source.userId, [
        { type: "text", text: "❌ ไม่สามารถวิเคราะห์ใบเสร็จได้ กรุณาตรวจสอบว่ารูปชัดเจนและเป็นใบเสร็จจริง" },
      ]);
    }
  } else {
    await replyLineMessage(token, replyToken, [
      { type: "text", text: "📸 ส่งรูปใบเสร็จมาได้เลย แล้วผมจะวิเคราะห์ให้!\n\nรองรับรูป JPG, PNG, WEBP" },
    ]);
  }
}

async function getLineImageContent(token: string, messageId: string): Promise<Buffer> {
  const response = await fetch(
    `https://api-data.line.me/v2/bot/message/${messageId}/content`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) {
    throw new Error(`LINE Content API error: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function replyLineMessage(token: string, replyToken: string, messages: any[]): Promise<void> {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ replyToken, messages }),
  });
}

async function pushLineMessage(token: string, userId: string, messages: any[]): Promise<void> {
  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to: userId, messages }),
  });
}
