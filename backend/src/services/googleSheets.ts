import { google } from "googleapis";
import type { ReceiptData } from "../types";

function getAuth() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return auth;
}

export async function appendToSheet(receiptData: ReceiptData, spreadsheetId: string): Promise<boolean> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const now = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });

  const rows = receiptData.items.map((item, index) => [
    now,
    receiptData.storeName,
    receiptData.date,
    item.name,
    item.quantity,
    item.price,
    index === receiptData.items.length - 1 ? receiptData.total : "",
  ]);

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetName = meta.data.sheets![0].properties!.title!;

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:G`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });

  return true;
}
