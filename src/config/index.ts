import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`متغیر محیطی ${name} تنظیم نشده است (فایل .env را ببین)`);
  return v;
}

export const config = {
  botToken: required("BOT_TOKEN"),
  databaseUrl: required("DATABASE_URL"),
  // آیدی عددی ادمین‌ها، با کاما جدا شده
  adminIds: required("ADMIN_IDS")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter(Boolean),
  // گروه/کانال دریافت درخواست‌های مشاوره (اختیاری)
  consultChatId: process.env.CONSULT_CHAT_ID
    ? Number(process.env.CONSULT_CHAT_ID)
    : null,
} as const;
