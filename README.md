# 🧾 Receipt Scanner By FLOKZ

AI-powered receipt scanner ที่วิเคราะห์ใบเสร็จด้วย OpenAI Vision, บันทึกลง Google Sheets, และแจ้งเตือนผ่าน LINE/Telegram

## ✨ Features

- 📷 อัพโหลดรูปใบเสร็จ (JPG, PNG, WEBP)
- 🤖 AI วิเคราะห์ข้อมูลจากใบเสร็จอัตโนมัติ
- 📊 บันทึกข้อมูลลง Google Sheets
- 📱 แจ้งเตือนผ่าน LINE และ Telegram
- 🔐 ระบบ Login/Register ด้วย Supabase Auth
- 🌐 รองรับ 2 ภาษา (ไทย/English)

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18 |
| Backend | Express.js, Node.js |
| Auth | Supabase Auth (JWT) |
| AI | OpenAI GPT-4 Vision |
| Storage | Google Sheets |
| Notifications | LINE Bot, Telegram Bot |

---

## 🚀 Setup Guide

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd receipt-scanner

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. ตั้งค่า Supabase (Authentication + Database)

1. ไปที่ [https://supabase.com](https://supabase.com) แล้วสร้าง project ใหม่
2. เมื่อสร้างเสร็จ ไปที่ **Settings → API** จะเจอ:
   - **Project URL** → ใช้เป็น `NEXT_PUBLIC_SUPABASE_URL` และ `SUPABASE_URL`
   - **anon public key** → ใช้เป็น `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → ใช้เป็น `SUPABASE_SERVICE_ROLE_KEY` (backend ใช้เขียน DB)

3. ไปที่ **Authentication → Settings**:
   - เปิด **Enable Email Signup**
   - (Optional) ปิด **Confirm email** ถ้าต้องการให้ login ได้เลยไม่ต้อง verify email

4. ไปที่ **SQL Editor** แล้ว run SQL จากไฟล์ `supabase-schema.sql`:
   - สร้าง table `user_settings` สำหรับเก็บ config ของแต่ละ user
   - เปิด Row Level Security (RLS) ให้ user เข้าถึงได้เฉพาะข้อมูลตัวเอง

### 3. ตั้งค่า Environment Variables

#### Backend (`backend/.env`)

```env
# OpenAI
OPENAI_API_KEY=sk-xxx

# Google Sheets
GOOGLE_SHEETS_ID=your_sheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nxxx\n-----END PRIVATE KEY-----\n

# LINE Bot
LINE_CHANNEL_ACCESS_TOKEN=your_token
LINE_USER_ID=your_user_id
LINE_CHANNEL_SECRET=your_secret

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Server
PORT=4000
FRONTEND_URL=http://localhost:3000

# Supabase Auth
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Webhook
WEBHOOK_BASE_URL=https://your-domain.com
```

#### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. หา Supabase Service Role Key

1. เข้า Supabase Dashboard → เลือก Project
2. ไปที่ **Settings** (ไอคอนเฟือง) → **API**
3. หา **service_role** key (ใต้ Project API keys)
4. Copy มาใส่ใน `backend/.env` ที่ `SUPABASE_SERVICE_ROLE_KEY`
5. ⚠️ **ห้ามเปิดเผย key นี้** — ใช้ฝั่ง backend เท่านั้น

### 5. Run Development

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000

---

## 📁 Project Structure

```
receipt-scanner/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express server + routes
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT verification middleware
│   │   └── services/
│   │       ├── openai.js         # OpenAI Vision API
│   │       ├── googleSheets.js   # Google Sheets API
│   │       ├── line.js           # LINE Bot API
│   │       ├── telegram.js       # Telegram Bot API
│   │       ├── userSettings.js   # User settings CRUD
│   │       ├── uploadUsage.js    # Upload quota tracking
│   │       └── stripe.js         # Stripe payment integration
│   ├── .env
│   └── package.json
├── frontend/
│   ├── src/app/
│   │   ├── page.js              # Main receipt scanner page
│   │   ├── layout.js            # Root layout with providers
│   │   ├── globals.css          # Global styles
│   │   ├── auth/
│   │   │   ├── AuthContext.js   # Auth state management
│   │   │   └── page.js          # Login/Register page
│   │   ├── topup/
│   │   │   ├── page.js          # Top-up packages page
│   │   │   └── success/
│   │   │       └── page.js      # Payment success page
│   │   ├── settings/
│   │   │   └── page.js          # User settings page
│   │   ├── components/
│   │   │   ├── AuthGuard.js     # Route protection
│   │   │   ├── LanguageSwitch.js
│   │   │   └── UserMenu.js      # User info + logout
│   │   ├── i18n/
│   │   │   ├── LanguageContext.js
│   │   │   └── translations.js  # TH/EN translations
│   │   └── lib/
│   │       └── supabase.js      # Supabase client
│   ├── .env.local
│   └── package.json
├── supabase-schema.sql           # Database schema (all tables)
├── .env.example
└── README.md
```

---

## 🔐 Authentication Flow

```
1. User เปิดเว็บ → AuthGuard ตรวจ session
2. ถ้าไม่มี session → แสดงหน้า Login/Register
3. User สมัคร/เข้าสู่ระบบ → Supabase Auth จัดการ
4. ได้ JWT token → เก็บใน Supabase client (auto refresh)
5. เรียก API → ส่ง token ใน Authorization header
6. Backend verify token ด้วย JWT Secret
7. ถ้า valid → ดำเนินการต่อ / ถ้าไม่ → 401 Unauthorized
```

---

## 🛡️ Security Notes

- Password hashing จัดการโดย Supabase (bcrypt)
- JWT token มี expiry (default 1 ชั่วโมง, auto refresh)
- Backend verify ทุก request ด้วย JWT Secret
- CORS จำกัดเฉพาะ frontend URL
- File upload จำกัดขนาด 10MB + ตรวจ MIME type
- ไม่เก็บ password ใน database ของเราเอง

---

## 📝 Notes

- ถ้าปิด email confirmation ใน Supabase จะ login ได้ทันทีหลังสมัคร
- ถ้าเปิด email confirmation ต้องกด link ใน email ก่อน login ได้
- JWT Secret ห้ามเปิดเผย (ใช้ verify token ฝั่ง backend เท่านั้น)

---

## 💳 Stripe Top-up Setup (ระบบเติมเงินเพิ่มโควต้า)

ระบบเติมเงินใช้ Stripe Checkout สำหรับรับชำระเงิน โดยราคา **฿2 ต่อการอัพโหลด 1 ครั้ง**

### Packages ที่มี

| Package | ราคา | Quota ที่ได้ |
|---------|------|-------------|
| 10 Scans | ฿20 | +10 ครั้ง |
| 50 Scans | ฿100 | +50 ครั้ง |
| 100 Scans | ฿200 | +100 ครั้ง |

### Step 1: สร้าง Stripe Account

1. ไปที่ [https://dashboard.stripe.com](https://dashboard.stripe.com) แล้วสมัคร/เข้าสู่ระบบ
2. สำหรับ development ให้ใช้ **Test Mode** (toggle ที่มุมขวาบน)

### Step 2: ดึง API Keys

1. ไปที่ **Developers → API Keys**
2. คัดลอก **Secret key** (`sk_test_...`) → ใส่ใน `backend/.env` ที่ `STRIPE_SECRET_KEY`

### Step 3: สร้าง Webhook Endpoint

1. ไปที่ **Developers → Webhooks → Add endpoint**
2. ตั้งค่า:
   - **Endpoint URL**: `https://your-backend-domain.com/webhook/stripe`
   - **Events to listen**: เลือก `checkout.session.completed`
3. หลังสร้างจะได้ **Signing Secret** (`whsec_...`) → ใส่ใน `backend/.env` ที่ `STRIPE_WEBHOOK_SECRET`

> 💡 **สำหรับ Local Development**: ใช้ Stripe CLI เพื่อ forward webhook มาที่ localhost
>
> ```bash
> # Install Stripe CLI (macOS)
> brew install stripe/stripe-cli/stripe
>
> # Login
> stripe login
>
> # Forward webhooks to local backend
> stripe listen --forward-to localhost:4000/webhook/stripe
> ```
>
> Stripe CLI จะแสดง webhook signing secret ให้ใช้ — copy ไปใส่ `STRIPE_WEBHOOK_SECRET`

### Step 4: เพิ่ม Environment Variables

เพิ่มใน `backend/.env`:

```env
# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here
```

### Step 5: Install Dependencies

```bash
cd backend
npm install stripe
```

### Step 6: รัน Database Migration

ไปที่ Supabase Dashboard → SQL Editor แล้วรัน:

```sql
-- Top-up Transactions Table
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

-- Add bonus_quota column
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS bonus_quota INTEGER DEFAULT 0;
```

### Step 7: ทดสอบการชำระเงิน

1. เปิดเว็บ → Login → กดปุ่ม "เติมโควต้า"
2. เลือก package → จะ redirect ไป Stripe Checkout
3. ใช้ **Test Card**: `4242 4242 4242 4242` (Exp: อะไรก็ได้ในอนาคต, CVC: อะไรก็ได้)
4. ชำระเงินสำเร็จ → redirect กลับมาหน้า success
5. กลับหน้าหลัก → จะเห็นโควต้าเพิ่มขึ้น

### Payment Flow

```
User กดเติมเงิน → เลือก Package → Backend สร้าง Checkout Session
→ Redirect ไป Stripe Checkout → User จ่ายเงิน (Card/PromptPay)
→ Stripe ส่ง Webhook → Backend verify + เพิ่ม bonus_quota
→ User กลับมาหน้า app → เห็น quota เพิ่มแล้ว
```

### หมายเหตุ

- โควต้าที่ซื้อ (bonus_quota) **ไม่มีวันหมดอายุ** — สะสมได้ตลอด
- Free tier (30 ครั้ง/เดือน) reset ทุกต้นเดือนตามปกติ
- Limit รวม = 30 (free) + bonus_quota (ที่ซื้อ)
- Webhook มี idempotency check — ไม่เพิ่ม quota ซ้ำแม้ Stripe ส่ง event ซ้ำ
- รองรับ PromptPay (QR Code) สำหรับ user ไทย
