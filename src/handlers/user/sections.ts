import type { Bot } from "gramio";
import {
  getSectionByKey,
  getSectionItems,
  getItemById,
} from "../../services/content.js";
import { sectionPage, itemPage } from "../../keyboards/index.js";
import { registerConsult } from "./consult.js";

export function registerSections(bot: Bot) {
  // بخش مشاوره فلوی خاص خودش را دارد
  registerConsult(bot);

  // باز کردن یک بخش محتوایی:  sec:<key>:<page>
  bot.callbackQuery(/^sec:(.+):(\d+)$/, async (ctx) => {
    const key = ctx.queryData[1];
    const page = Number(ctx.queryData[2]);

    if (key === "consult") return; // با هندلر مشاوره پوشش داده می‌شود

    const section = await getSectionByKey(key);
    if (!section || !section.isActive) {
      await ctx.answerCallbackQuery({ text: "این بخش در دسترس نیست." });
      return;
    }

    const items = await getSectionItems(section.id);
    const intro = section.intro?.trim() || section.title;

    const body =
      items.length === 0
        ? `${intro}\n\n— هنوز محتوایی اضافه نشده است.`
        : intro;

    await ctx
      .editText(body, { reply_markup: sectionPage(key, items, page) })
      .catch(() => {});
    await ctx.answerCallbackQuery();
  });

  // باز کردن یک آیتم:  item:<id>
  bot.callbackQuery(/^item:(\d+)$/, async (ctx) => {
    const id = Number(ctx.queryData[1]);
    const item = await getItemById(id);
    if (!item || !item.isActive) {
      await ctx.answerCallbackQuery({ text: "این آیتم در دسترس نیست." });
      return;
    }

    const caption = [item.title, item.description?.trim()]
      .filter(Boolean)
      .join("\n\n");

    // فایل: می‌فرستیم به‌صورت پیام جدید با نوع درست
    if (item.kind === "file" && item.fileId) {
      await ctx.answerCallbackQuery();
      const kb = itemPage(item);
      const opts = { reply_markup: kb, caption };
      switch (item.fileKind) {
        case "audio":    return void ctx.sendAudio(item.fileId, opts);
        case "voice":    return void ctx.sendVoice(item.fileId, { reply_markup: kb });
        case "video":    return void ctx.sendVideo(item.fileId, opts);
        case "photo":    return void ctx.sendPhoto(item.fileId, opts);
        default:         return void ctx.sendDocument(item.fileId, opts);
      }
    }

    // لینک: کپشن + دکمه شیشه‌ای لینک
    await ctx
      .editText(caption || item.title, { reply_markup: itemPage(item) })
      .catch(() => {});
    await ctx.answerCallbackQuery();
  });
}
