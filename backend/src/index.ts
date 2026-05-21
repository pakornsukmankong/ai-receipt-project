import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import multer from "multer";
import Stripe from "stripe";
import rateLimit from "express-rate-limit";
import { requireAuth } from "./middleware/auth";
import { analyzeReceipt } from "./services/openai";
import { appendToSheet } from "./services/googleSheets";
import { sendLineNotification, handleLineWebhook } from "./services/line";
import { sendTelegramNotification, handleTelegramWebhook } from "./services/telegram";
import { getUserSettings, upsertUserSettings } from "./services/userSettings";
import { canUpload, recordUpload } from "./services/uploadUsage";
import { getPackages, createCheckoutSession, handleWebhookEvent, getTransactionHistory } from "./services/stripe";
import { logger } from "./services/logger";
import type { AuthenticatedRequest } from "./types";

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));

// ─── Rate Limiting ───────────────────────────────────────────────────

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "คำขอมากเกินไป กรุณารอสักครู่", code: "RATE_LIMITED" },
});

const uploadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5, // 5 uploads per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "อัพโหลดเร็วเกินไป กรุณารอสักครู่", code: "UPLOAD_RATE_LIMITED" },
});

app.use("/api/", apiLimiter);
app.use("/api/upload-receipt", uploadLimiter);

// ─── Webhook routes (no auth) ────────────────────────────────────────

app.post("/webhook/line", express.json(), async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-line-signature"] as string | undefined;
    await handleLineWebhook(req.body, signature);
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error("LINE Webhook error:", error);
    res.status(200).json({ success: false });
  }
});

app.post("/webhook/telegram", express.json(), async (req: Request, res: Response) => {
  try {
    await handleTelegramWebhook(req.body);
    res.status(200).json({ ok: true });
  } catch (error) {
    logger.error("Telegram Webhook error:", error);
    res.status(200).json({ ok: true });
  }
});

app.post("/webhook/stripe", express.raw({ type: "application/json" }), async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    res.status(500).json({ error: "Stripe is not configured" });
    return;
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

    const result = await handleWebhookEvent(event);
    if (result.processed) {
      logger.info("Stripe webhook processed", result as unknown as Record<string, unknown>);
    }
    res.status(200).json({ received: true, result });
  } catch (err: any) {
    logger.error("Stripe webhook error:", err.message);
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }
});

app.use(express.json());

// ─── User Settings API ───────────────────────────────────────────────

app.get("/api/settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const settings = await getUserSettings(user.id);
    if (!settings) {
      res.json({
        success: true,
        data: { googleSheetId: "", lineChannelAccessToken: "", lineUserId: "", telegramBotToken: "", telegramChatId: "" },
      });
      return;
    }
    res.json({
      success: true,
      data: {
        googleSheetId: settings.google_sheet_id,
        lineChannelAccessToken: settings.line_channel_access_token,
        lineUserId: settings.line_user_id,
        telegramBotToken: settings.telegram_bot_token,
        telegramChatId: settings.telegram_chat_id,
      },
    });
  } catch (error) {
    logger.error("Get settings error:", error);
    res.status(500).json({ error: "ไม่สามารถโหลดการตั้งค่าได้" });
  }
});

app.put("/api/settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { googleSheetId, lineChannelAccessToken, lineUserId, telegramBotToken, telegramChatId } = req.body;

    await upsertUserSettings(user.id, { googleSheetId, lineChannelAccessToken, lineUserId, telegramBotToken, telegramChatId });
    res.json({ success: true, message: "บันทึกการตั้งค่าสำเร็จ" });
  } catch (error) {
    logger.error("Save settings error:", error);
    res.status(500).json({ error: "ไม่สามารถบันทึกการตั้งค่าได้" });
  }
});

// ─── Upload Usage API ────────────────────────────────────────────────

app.get("/api/usage", requireAuth, async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const usage = await canUpload(user.id);
    res.json({
      success: true,
      data: {
        currentUsage: usage.currentUsage,
        limit: usage.limit,
        freeLimit: usage.freeLimit,
        bonusQuota: usage.bonusQuota,
        remaining: usage.remaining,
        isAllowed: usage.isAllowed,
      },
    });
  } catch (error) {
    logger.error("Get usage error:", error);
    res.status(500).json({ error: "ไม่สามารถโหลดข้อมูลการใช้งานได้" });
  }
});

// ─── Upload Receipt API ──────────────────────────────────────────────

const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.single("receipt")(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ error: "ไฟล์มีขนาดใหญ่เกินไป", code: "FILE_TOO_LARGE", message: "ขนาดไฟล์ต้องไม่เกิน 10MB กรุณาลดขนาดรูปแล้วลองใหม่" });
        return;
      }
      res.status(400).json({ error: "อัพโหลดไฟล์ไม่สำเร็จ", code: "UPLOAD_ERROR", message: `เกิดข้อผิดพลาดในการอัพโหลด: ${err.message}` });
      return;
    }
    if (err) {
      res.status(500).json({ error: "เกิดข้อผิดพลาดภายในระบบ", code: "INTERNAL_ERROR", message: "ไม่สามารถอัพโหลดไฟล์ได้ กรุณาลองใหม่อีกครั้ง" });
      return;
    }
    next();
  });
};

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

app.post("/api/upload-receipt", requireAuth, handleUpload, async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;

    if (!req.file) {
      res.status(400).json({ error: "ไม่พบไฟล์", code: "NO_FILE", message: "กรุณาเลือกรูปใบเสร็จที่ต้องการอัพโหลด" });
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      res.status(400).json({ error: "ประเภทไฟล์ไม่ถูกต้อง", code: "INVALID_FILE_TYPE", message: `รองรับเฉพาะไฟล์ JPG, PNG, WEBP เท่านั้น (ได้รับ: ${req.file.mimetype})` });
      return;
    }

    if (req.file.size === 0) {
      res.status(400).json({ error: "ไฟล์ว่างเปล่า", code: "EMPTY_FILE", message: "ไฟล์ที่อัพโหลดไม่มีข้อมูล กรุณาเลือกไฟล์ใหม่" });
      return;
    }

    const usageCheck = await canUpload(user.id);
    if (!usageCheck.isAllowed) {
      res.status(429).json({
        error: "เกินโควต้าการอัพโหลด",
        code: "UPLOAD_LIMIT_EXCEEDED",
        message: `คุณใช้โควต้าอัพโหลดครบ ${usageCheck.limit} ครั้งแล้วในเดือนนี้ กรุณาเติมเงินเพื่อเพิ่มโควต้า`,
        usage: { currentUsage: usageCheck.currentUsage, limit: usageCheck.limit, remaining: 0 },
      });
      return;
    }

    const userSettings = await getUserSettings(user.id);
    const base64Image = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype;

    let receiptData;
    try {
      receiptData = await analyzeReceipt(base64Image, mimeType);
    } catch (err) {
      logger.error("OpenAI error:", err);
      res.status(422).json({ error: "ไม่สามารถวิเคราะห์ใบเสร็จได้", code: "AI_ANALYSIS_FAILED", message: "AI ไม่สามารถอ่านข้อมูลจากรูปได้ กรุณาตรวจสอบว่ารูปชัดเจนและเป็นใบเสร็จจริง" });
      return;
    }

    await recordUpload(user.id);

    let sheetSaved = false;
    const sheetId = userSettings?.google_sheet_id;
    if (sheetId) {
      try { await appendToSheet(receiptData, sheetId); sheetSaved = true; } catch (err) { logger.error("Google Sheets error:", err); }
    }

    let lineSent = false;
    const lineToken = userSettings?.line_channel_access_token;
    const lineUserId = userSettings?.line_user_id;
    if (lineToken && lineUserId) {
      try { await sendLineNotification(receiptData, lineToken, lineUserId); lineSent = true; } catch (err) { logger.error("LINE notification error:", err); }
    }

    let telegramSent = false;
    const tgToken = userSettings?.telegram_bot_token;
    const tgChatId = userSettings?.telegram_chat_id;
    if (tgToken && tgChatId) {
      try { await sendTelegramNotification(receiptData, tgToken, tgChatId); telegramSent = true; } catch (err) { logger.error("Telegram notification error:", err); }
    }

    const warnings: { code: string; message: string }[] = [];
    if (sheetId && !sheetSaved) warnings.push({ code: "SHEET_FAILED", message: "ไม่สามารถบันทึกลง Google Sheets ได้ กรุณาตรวจสอบ Sheet ID" });
    if (lineToken && !lineSent) warnings.push({ code: "LINE_FAILED", message: "ไม่สามารถส่งแจ้งเตือน LINE ได้ กรุณาตรวจสอบ Token" });
    if (tgToken && !telegramSent) warnings.push({ code: "TELEGRAM_FAILED", message: "ไม่สามารถส่งแจ้งเตือน Telegram ได้ กรุณาตรวจสอบ Token" });

    res.json({ success: true, data: receiptData, services: { sheetSaved, lineSent, telegramSent }, warnings });
  } catch (error) {
    logger.error("Unexpected error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดที่ไม่คาดคิด", code: "INTERNAL_ERROR", message: "ระบบเกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" });
  }
});

// ─── Stripe Top-up API ───────────────────────────────────────────────

app.get("/api/topup/packages", requireAuth, (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: getPackages() });
  } catch {
    res.status(500).json({ error: "ระบบเติมเงินยังไม่พร้อมใช้งาน" });
  }
});

app.post("/api/topup/create-session", requireAuth, async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { packageId } = req.body;

    if (!packageId) { res.status(400).json({ error: "กรุณาเลือกแพ็กเกจ", code: "NO_PACKAGE" }); return; }
    if (!process.env.STRIPE_SECRET_KEY) { res.status(503).json({ error: "ระบบเติมเงินยังไม่ได้ตั้งค่า", code: "STRIPE_NOT_CONFIGURED" }); return; }

    const result = await createCheckoutSession(user.id, user.email, packageId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error("Create checkout session error:", error);
    if (error.message === "Invalid package ID") { res.status(400).json({ error: "แพ็กเกจไม่ถูกต้อง", code: "INVALID_PACKAGE" }); return; }
    res.status(500).json({ error: "ไม่สามารถสร้างรายการชำระเงินได้", code: "CHECKOUT_ERROR" });
  }
});

app.get("/api/topup/history", requireAuth, async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const transactions = await getTransactionHistory(user.id);
    res.json({ success: true, data: transactions });
  } catch (error) {
    logger.error("Get transaction history error:", error);
    res.status(500).json({ error: "ไม่สามารถโหลดประวัติการเติมเงินได้" });
  }
});

// ─── Telegram Webhook Setup ──────────────────────────────────────────

app.get("/api/setup-telegram-webhook", async (_req: Request, res: Response) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const webhookUrl = process.env.WEBHOOK_BASE_URL;

  if (!botToken || !webhookUrl) {
    res.status(400).json({ error: "กรุณาตั้งค่า TELEGRAM_BOT_TOKEN และ WEBHOOK_BASE_URL ใน .env" });
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: `${webhookUrl}/webhook/telegram` }),
    });
    const data = await response.json();
    res.json({ success: true, telegram: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Start Server ────────────────────────────────────────────────────

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
