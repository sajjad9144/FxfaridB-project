import type { Bot } from "gramio";
import { getSetting } from "../../services/content.js";
import { consultMenu } from "../../keyboards/index.js";
import { config } from "../../config/index.js";
import {
  consultSessions,
  saveConsult,
  isValidEmail,
} from "../../services/consult.js";

export function registerConsult(bot: Bot) {
  // ورود به بخش مشاوره: ویس توضیحات + دو دکمه
  bot.callbackQuery("sec:consult:0", async (ctx) => {
    const voice = await getSetting("consult_voice_file_id");
    await ctx.answerCallbackQuery();
    if (voice) {
      await ctx.sendVoice(voice, { reply_markup: consultMenu() }).catch(async () => {
        await ctx.send("بخش مشاوره", { reply_markup: consultMenu() });
      });
    } else {
      await ctx.send("بخش مشاوره", { reply_markup: consultMenu() });
    }
  });

  // تعرفه
  bot.callbackQuery("consult:tariff", async (ctx) => {
    const t = await getSetting("consult_tariff_text");
    await ctx.answerCallbackQuery();
    await ctx.send(t || "تعرفه هنوز وارد نشده است.", {
      reply_markup: consultMenu(),
    });
  });

  // شروع فرم ثبت درخواست
  bot.callbackQuery("consult:start", async (ctx) => {
    consultSessions.set(ctx.from!.id, { step: "name", data: {} });
    await ctx.answerCallbackQuery();
    await ctx.send("نام و نام خانوادگی‌ات را بنویس:");
  });

  // دریافت ورودی‌های متنی فرم (فقط وقتی سشن فعال است)
  bot.on("message", async (ctx, next) => {
    const uid = ctx.from?.id;
    const text = ctx.text?.trim();
    if (!uid || !text) return next();

    const session = consultSessions.get(uid);
    if (!session) return next(); // پیام ربطی به فرم ندارد → ادامه به بقیه هندلرها

    switch (session.step) {
      case "name":
        session.data.name = text;
        session.step = "email";
        await ctx.send("آدرس ایمیل‌ات را بنویس:");
        break;

      case "email":
        if (!isValidEmail(text)) {
          await ctx.send("ایمیل معتبر نیست، دوباره بنویس:");
          return;
        }
        session.data.email = text;
        session.step = "handle";
        await ctx.send("آیدی تلگرام‌ات را بنویس (مثلاً @username):");
        break;

      case "handle":
        session.data.handle = text;
        session.step = "note";
        await ctx.send("توضیح کوتاه درباره درخواستت بنویس (یا بنویس «رد»):");
        break;

      case "note": {
        session.data.note = text === "رد" ? "" : text;
        consultSessions.delete(uid);

        const saved = await saveConsult({
          telegramId: uid,
          fullName: session.data.name!,
          email: session.data.email!,
          telegramHandle: session.data.handle!,
          note: session.data.note,
        });

        await ctx.send("✅ درخواستت ثبت شد. به‌زودی باهات تماس می‌گیریم.");
        await notifyAdmins(bot, {
          id: saved.id,
          name: session.data.name!,
          email: session.data.email!,
          handle: session.data.handle!,
          note: session.data.note || "—",
        });
        break;
      }
    }
  });
}

async function notifyAdmins(
  bot: Bot,
  r: { id: number; name: string; email: string; handle: string; note: string }
) {
  const msg =
    `📥 درخواست مشاوره جدید #${r.id}\n\n` +
    `👤 ${r.name}\n` +
    `📧 ${r.email}\n` +
    `🔗 ${r.handle}\n` +
    `📝 ${r.note}`;

  const targets = config.consultChatId
    ? [config.consultChatId]
    : config.adminIds;

  for (const chatId of targets) {
    await bot.api
      .sendMessage({ chat_id: chatId, text: msg })
      .catch(() => {});
  }
}
