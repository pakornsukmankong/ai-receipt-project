import OpenAI from "openai";
import type { ReceiptData } from "../types";

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured. Please add it to environment variables.");
    }
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

export async function analyzeReceipt(base64Image: string, mimeType: string): Promise<ReceiptData> {
  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `คุณเป็น AI ที่เชี่ยวชาญในการอ่านใบเสร็จ กรุณาวิเคราะห์ใบเสร็จและตอบกลับเป็น JSON เท่านั้น ในรูปแบบ:
{
  "storeName": "ชื่อร้าน",
  "date": "วันที่ (DD/MM/YYYY)",
  "items": [
    { "name": "ชื่อสินค้า", "quantity": จำนวน, "price": ราคา }
  ],
  "total": ยอดรวมทั้งหมด
}
ถ้าอ่านข้อมูลไม่ได้ให้ใส่ "ไม่ระบุ" หรือ 0`,
      },
      {
        role: "user",
        content: [
          { type: "text", text: "กรุณาวิเคราะห์ใบเสร็จนี้" },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64Image}` },
          },
        ],
      },
    ],
    max_tokens: 2000,
  });

  const content = response.choices[0].message.content!;

  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/({[\s\S]*})/);
  if (!jsonMatch) {
    throw new Error("ไม่สามารถอ่านข้อมูลจากใบเสร็จได้");
  }

  const parsed: ReceiptData = JSON.parse(jsonMatch[1]);
  return parsed;
}
