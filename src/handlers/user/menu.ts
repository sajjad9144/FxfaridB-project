import type { Bot } from "gramio";
import { upsertUser, isAdmin } from "../../services/users.js";
import { getActiveSections, getSetting } from "../../services/content.js";
import { mainMenu } from "../../keyboards/index.js";

async function renderHome(adminUser = false) {
  const [text, secs] = await Promise.all([
    getSetting("welcome_text"),
    getActiveSections(),
  ]);
  return {
    text: text || "یکی از بخش‌ها را انتخاب کن:",
    keyboard: mainMenu(secs, adminUser),
  };
}

export function registerMenu(bot: Bot) {
  bot.command("start", async (ctx) => {
    await upsertUser({
      telegramId: ctx.from!.id,
      username: ctx.from!.username,
      firstName: ctx.from!.firstName,
    });
    const { text, keyboard } = await renderHome(isAdmin(ctx.from!.id));
    await ctx.send(text, { reply_markup: keyboard });
  });

  // بازگشت به منوی اصلی (ویرایش همان پیام تا چت شلوغ نشود)
  bot.callbackQuery("home", async (ctx) => {
    const { text, keyboard } = await renderHome();
    await ctx.editText(text, { reply_markup: keyboard }).catch(() => {});
    await ctx.answerCallbackQuery();
  });

  // دکمه‌های تزئینی (شماره صفحه)
  bot.callbackQuery("noop", (ctx) => ctx.answerCallbackQuery());
}
