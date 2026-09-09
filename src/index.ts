import { Bot } from "gramio";
import { config } from "./config/index.js";
import { registerMenu } from "./handlers/user/menu.js";
import { registerSections } from "./handlers/user/sections.js";
import { registerAdmin } from "./handlers/admin/index.js";

const bot = new Bot(config.botToken);

// ── ثبت هندلرها ─────────────────────────────────────────────
registerAdmin(bot);   // اول ادمین (کامندها و گارد)
registerMenu(bot);    // /start و منوی اصلی
registerSections(bot); // بخش‌ها، آیتم‌ها، مشاوره

// ── خطاگیری سراسری ──────────────────────────────────────────
bot.onError(({ context, error }) => {
  console.error("Bot error:", error);
  if ("answerCallbackQuery" in context && typeof context.answerCallbackQuery === "function") {
    (context.answerCallbackQuery as (p: { text: string }) => Promise<unknown>)({
      text: "خطایی رخ داد. دوباره تلاش کن.",
    }).catch(() => {});
  }
});

bot.start().then(() => {
  console.log("🤖 FX FARID bot started (polling)");
});
