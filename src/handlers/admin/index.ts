import type { Bot } from "gramio";
import { InlineKeyboard } from "gramio";
import { isAdmin } from "../../services/users.js";
import { setSetting } from "../../services/content.js";
import {
  listAllSections,
  getSection,
  updateSectionTitle,
  updateSectionIntro,
  updateSectionEmoji,
  updateSectionStyle,
  toggleSection,
  listItems,
  addLinkItem,
  addFileItem,
  deleteItem,
  toggleItem,
  listConsultRequests,
} from "../../services/adminCrud.js";
import { adminSessions, clearAdmin } from "../../services/adminState.js";

/* ── منوها ───────────────────────────────────────────────── */
function adminMenu(): InlineKeyboard {
  return new InlineKeyboard()
    .text("📚 مدیریت محتوا", "adm:content").row()
    .text("✏️ ویرایش بخش‌ها", "adm:sections").row()
    .text("🎙 مشاوره (ویس/تعرفه)", "adm:consult").row()
    .text("📥 درخواست‌های مشاوره", "adm:requests").row();
}

function backTo(target: string): InlineKeyboard {
  return new InlineKeyboard().text("⬅️ بازگشت", target);
}

export function registerAdmin(bot: Bot) {
  bot.command("admin", async (ctx) => {
    if (!ctx.from || !isAdmin(ctx.from.id)) return;
    clearAdmin(ctx.from.id);
    await ctx.send("پنل مدیریت FX FARID", { reply_markup: adminMenu() });
  });

  // به‌جای گاردِ سراسری (که کلیک را می‌گیرد ولی به هندلرها پاس نمی‌دهد)،
  // چک ادمین را داخل هر دکمه با این wrapper می‌گذاریم.
  const admOnly =
    (fn: (ctx: any) => Promise<void>) => async (ctx: any) => {
      if (!ctx.from || !isAdmin(ctx.from.id)) {
        await ctx.answerCallbackQuery({ text: "دسترسی نداری." });
        return;
      }
      return fn(ctx);
    };


  /* ── منوی اصلی پنل ───────────────────────────────────── */
  bot.callbackQuery("adm:home", admOnly(async (ctx) => {
    clearAdmin(ctx.from.id);
    await ctx.editText("پنل مدیریت FX FARID", { reply_markup: adminMenu() }).catch(() => {});
    await ctx.answerCallbackQuery();
  }));

  /* ── مدیریت محتوا: انتخاب بخش ─────────────────────────── */
  bot.callbackQuery("adm:content", admOnly(async (ctx) => {
    const secs = await listAllSections();
    const kb = new InlineKeyboard();
    for (const s of secs) {
      if (s.key === "consult") continue; // مشاوره محتوای لیستی ندارد
      kb.text(s.title, `adm:sec:${s.id}`).row();
    }
    kb.text("⬅️ بازگشت", "adm:home");
    await ctx.editText("کدام بخش را می‌خواهی مدیریت کنی؟", { reply_markup: kb }).catch(() => {});
    await ctx.answerCallbackQuery();
  }));

  /* ── نمایش آیتم‌های یک بخش ─────────────────────────────── */
  bot.callbackQuery(/^adm:sec:(\d+)$/, admOnly(async (ctx) => {
    const id = Number(ctx.queryData[1]);
    await showSectionItems(ctx, id);
    await ctx.answerCallbackQuery();
  }));

  async function showSectionItems(ctx: any, id: number) {
    const sec = await getSection(id);
    if (!sec) return;
    const items = await listItems(id);
    const kb = new InlineKeyboard();
    for (const it of items) {
      const mark = it.isActive ? "" : "🚫 ";
      kb.text(`${mark}${it.title}`, `adm:item:${it.id}`).row();
    }
    kb.text("➕ افزودن آیتم", `adm:additem:${id}`).row();
    kb.text("⬅️ بازگشت", "adm:content");
    const body =
      `📂 ${sec.title}\n\n` +
      (items.length ? `${items.length} آیتم:` : "هنوز آیتمی ندارد.");
    await ctx.editText(body, { reply_markup: kb }).catch(() => {});
  }

  /* ── یک آیتم: حذف / فعال-غیرفعال ──────────────────────── */
  bot.callbackQuery(/^adm:item:(\d+)$/, admOnly(async (ctx) => {
    const itemId = Number(ctx.queryData[1]);
    const kb = new InlineKeyboard()
      .text("🗑 حذف", `adm:delitem:${itemId}`)
      .text("🔁 فعال/غیرفعال", `adm:togitem:${itemId}`).row()
      .text("⬅️ بازگشت", "adm:content");
    await ctx.editText("این آیتم را چه کنیم؟", { reply_markup: kb }).catch(() => {});
    await ctx.answerCallbackQuery();
  }));

  bot.callbackQuery(/^adm:delitem:(\d+)$/, admOnly(async (ctx) => {
    const itemId = Number(ctx.queryData[1]);
    await deleteItem(itemId);
    await ctx.answerCallbackQuery({ text: "حذف شد." });
    await ctx.editText("✅ آیتم حذف شد.", { reply_markup: backTo("adm:content") }).catch(() => {});
  }));

  bot.callbackQuery(/^adm:togitem:(\d+)$/, admOnly(async (ctx) => {
    const itemId = Number(ctx.queryData[1]);
    // وضعیت فعلی را نمی‌دانیم؛ ساده: غیرفعالش را فعال و برعکس با یک خواندن
    const { db } = await import("../../db/index.js");
    const { contentItems } = await import("../../db/schema.js");
    const { eq } = await import("drizzle-orm");
    const [row] = await db.select().from(contentItems).where(eq(contentItems.id, itemId));
    if (row) await toggleItem(itemId, !row.isActive);
    await ctx.answerCallbackQuery({ text: row && !row.isActive ? "فعال شد." : "غیرفعال شد." });
    await ctx.editText("✅ انجام شد.", { reply_markup: backTo("adm:content") }).catch(() => {});
  }));

  /* ── افزودن آیتم: شروع فلو ────────────────────────────── */
  bot.callbackQuery(/^adm:additem:(\d+)$/, admOnly(async (ctx) => {
    const sectionId = Number(ctx.queryData[1]);
    adminSessions.set(ctx.from.id, { type: "item_title", sectionId });
    await ctx.answerCallbackQuery();
    await ctx.send("عنوان آیتم را بفرست:");
  }));

  /* ── ویرایش بخش‌ها ─────────────────────────────────────── */
  bot.callbackQuery("adm:sections", admOnly(async (ctx) => {
    const secs = await listAllSections();
    const kb = new InlineKeyboard();
    for (const s of secs) {
      const mark = s.isActive ? "" : "🚫 ";
      kb.text(`${mark}${s.title}`, `adm:editsec:${s.id}`).row();
    }
    kb.text("⬅️ بازگشت", "adm:home");
    await ctx.editText("کدام بخش را ویرایش کنی؟", { reply_markup: kb }).catch(() => {});
    await ctx.answerCallbackQuery();
  }));

  bot.callbackQuery(/^adm:editsec:(\d+)$/, admOnly(async (ctx) => {
    const id = Number(ctx.queryData[1]);
    const sec = await getSection(id);
    if (!sec) return void ctx.answerCallbackQuery();
    const kb = new InlineKeyboard()
      .text("✏️ عنوان", `adm:sectitle:${id}`)
      .text("📝 متن توضیح", `adm:secintro:${id}`).row()
      .text("😀 ایموجی", `adm:secemoji:${id}`)
      .text("🎨 رنگ", `adm:seccolor:${id}`).row()
      .text(sec.isActive ? "🚫 غیرفعال کن" : "✅ فعال کن", `adm:sectoggle:${id}`).row()
      .text("⬅️ بازگشت", "adm:sections");
    const body = `📂 ${sec.title}\n\nمتن فعلی:\n${sec.intro || "—"}`;
    await ctx.editText(body, { reply_markup: kb }).catch(() => {});
    await ctx.answerCallbackQuery();
  }));

  bot.callbackQuery(/^adm:sectitle:(\d+)$/, admOnly(async (ctx) => {
    const id = Number(ctx.queryData[1]);
    adminSessions.set(ctx.from.id, { type: "section_title", sectionId: id });
    await ctx.answerCallbackQuery();
    await ctx.send("عنوان جدید بخش را بفرست:");
  }));

  bot.callbackQuery(/^adm:secintro:(\d+)$/, admOnly(async (ctx) => {
    const id = Number(ctx.queryData[1]);
    adminSessions.set(ctx.from.id, { type: "section_intro", sectionId: id });
    await ctx.answerCallbackQuery();
    await ctx.send("متن توضیح جدید را بفرست:");
  }));

  bot.callbackQuery(/^adm:secemoji:(\d+)$/, admOnly(async (ctx) => {
    const id = Number(ctx.queryData[1]);
    adminSessions.set(ctx.from.id, { type: "section_emoji", sectionId: id });
    await ctx.answerCallbackQuery();
    await ctx.send("یک ایموجی بفرست:");
  }));

    bot.callbackQuery(/^adm:seccolor:(\d+)$/, admOnly(async (ctx) => {
    const id = Number(ctx.queryData[1]);
    const kb = new InlineKeyboard()
      .text("🔵 آبی", `adm:setcolor:${id}:primary`)
      .text("🟢 سبز", `adm:setcolor:${id}:success`).row()
      .text("🔴 قرمز", `adm:setcolor:${id}:danger`)
      .text("⚪ بدون رنگ", `adm:setcolor:${id}:none`).row()
      .text("⬅️ بازگشت", `adm:editsec:${id}`);
    await ctx.editText("رنگ دکمه این بخش را انتخاب کن:", { reply_markup: kb }).catch(() => {});
    await ctx.answerCallbackQuery();
  }));

  bot.callbackQuery(/^adm:setcolor:(\d+):(\w+)$/, admOnly(async (ctx) => {
    const id = Number(ctx.queryData[1]);
    const color = ctx.queryData[2];
    await updateSectionStyle(id, color === "none" ? null : color);
    await ctx.answerCallbackQuery({ text: "رنگ ثبت شد." });
    await ctx.editText("✅ رنگ دکمه تغییر کرد. با /start ببین.", { reply_markup: backTo("adm:sections") }).catch(() => {});
  }));

  bot.callbackQuery(/^adm:sectoggle:(\d+)$/, admOnly(async (ctx) => {
    const id = Number(ctx.queryData[1]);
    const sec = await getSection(id);
    if (sec) await toggleSection(id, !sec.isActive);
    await ctx.answerCallbackQuery({ text: "انجام شد." });
    await ctx.editText("✅ وضعیت بخش تغییر کرد.", { reply_markup: backTo("adm:sections") }).catch(() => {});
  }));

  /* ── مشاوره: ویس و تعرفه ──────────────────────────────── */
  bot.callbackQuery("adm:consult", admOnly(async (ctx) => {
    const kb = new InlineKeyboard()
      .text("🎙 تنظیم ویس", "adm:setvoice").row()
      .text("💰 تنظیم متن تعرفه", "adm:settariff").row()
      .text("⬅️ بازگشت", "adm:home");
    await ctx.editText("تنظیمات بخش مشاوره:", { reply_markup: kb }).catch(() => {});
    await ctx.answerCallbackQuery();
  }));

  bot.callbackQuery("adm:setvoice", admOnly(async (ctx) => {
    adminSessions.set(ctx.from.id, { type: "consult_voice" });
    await ctx.answerCallbackQuery();
    await ctx.send("یک پیام ویس بفرست تا به‌عنوان توضیحات مشاوره ذخیره شود:");
  }));

  bot.callbackQuery("adm:settariff", admOnly(async (ctx) => {
    adminSessions.set(ctx.from.id, { type: "consult_tariff" });
    await ctx.answerCallbackQuery();
    await ctx.send("متن تعرفه را بفرست:");
  }));

  /* ── دیدن درخواست‌های مشاوره ──────────────────────────── */
  bot.callbackQuery("adm:requests", admOnly(async (ctx) => {
    const reqs = await listConsultRequests(10);
    const body = reqs.length
      ? reqs
          .map(
            (r) =>
              `#${r.id} — ${r.fullName || "?"}\n📧 ${r.email || "?"}\n🔗 ${r.telegramHandle || "?"}\n📝 ${r.note || "—"}`
          )
          .join("\n\n")
      : "درخواستی ثبت نشده.";
    await ctx.editText(body, { reply_markup: backTo("adm:home") }).catch(() => {});
    await ctx.answerCallbackQuery();
  }));

  /* ── هندلر ورودی‌های ادمین (متن/فایل) ─────────────────── */
  bot.on("message", async (ctx, next) => {
    const uid = ctx.from?.id;
    if (!uid || !isAdmin(uid)) return next();
    const action = adminSessions.get(uid);
    if (!action) return next();

    switch (action.type) {
      case "section_title": {
        const t = ctx.text?.trim();
        if (!t) return void ctx.send("یک متن بفرست.");
        await updateSectionTitle(action.sectionId, t);
        clearAdmin(uid);
        await ctx.send("✅ عنوان بخش به‌روزرسانی شد.", { reply_markup: backTo("adm:sections") });
        return;
      }
      case "section_intro": {
        const t = ctx.text?.trim();
        if (!t) return void ctx.send("یک متن بفرست.");
        await updateSectionIntro(action.sectionId, t);
        clearAdmin(uid);
        await ctx.send("✅ متن توضیح به‌روزرسانی شد.", { reply_markup: backTo("adm:sections") });
        return;
      }
      case "section_emoji": {
        const t = ctx.text?.trim();
        await updateSectionEmoji(action.sectionId, t);
        clearAdmin(uid);
        await ctx.send("✅ ایموجی ذخیره شد.", { reply_markup: backTo("adm:sections") });
        return;
      }
      case "consult_tariff": {
        const t = ctx.text?.trim();
        if (!t) return void ctx.send("یک متن بفرست.");
        await setSetting("consult_tariff_text", t);
        clearAdmin(uid);
        await ctx.send("✅ متن تعرفه ذخیره شد.", { reply_markup: backTo("adm:consult") });
        return;
      }
      case "consult_voice": {
        const v = ctx.voice;
        if (!v) return void ctx.send("لطفاً یک پیام ویس بفرست.");
        await setSetting("consult_voice_file_id", v.fileId);
        clearAdmin(uid);
        await ctx.send("✅ ویس مشاوره ذخیره شد.", { reply_markup: backTo("adm:consult") });
        return;
      }
      case "item_title": {
        const t = ctx.text?.trim();
        if (!t) return void ctx.send("عنوان را به‌صورت متن بفرست.");
        adminSessions.set(uid, { type: "item_desc", sectionId: action.sectionId, title: t });
        await ctx.send("توضیح آیتم را بفرست (یا بنویس «رد»):");
        return;
      }
      case "item_desc": {
        const t = ctx.text ?? "";
        const desc = t.trim() === "رد" ? "" : t.trim();
        adminSessions.set(uid, {
          type: "item_payload",
          sectionId: action.sectionId,
          title: action.title,
          desc,
        });
        await ctx.send("حالا یا یک لینک بفرست، یا یک فایل (صوت/ویدیو/عکس/ویس/داکیومنت):");
        return;
      }
      case "item_payload": {
        // فایل؟
        const voice = ctx.voice;
        const audio = ctx.audio;
        const video = ctx.video;
        const doc = ctx.document;
        const photos = ctx.photo;

        if (voice || audio || video || doc || (photos && photos.length)) {
          let fileId = "";
          let fileKind: "audio" | "video" | "photo" | "document" | "voice" = "document";
          if (voice) { fileId = voice.fileId; fileKind = "voice"; }
          else if (audio) { fileId = audio.fileId; fileKind = "audio"; }
          else if (video) { fileId = video.fileId; fileKind = "video"; }
          else if (photos && photos.length) { fileId = photos[photos.length - 1].fileId; fileKind = "photo"; }
          else if (doc) { fileId = doc.fileId; fileKind = "document"; }

          await addFileItem({
            sectionId: action.sectionId,
            title: action.title,
            description: action.desc,
            fileId,
            fileKind,
          });
          clearAdmin(uid);
          await ctx.send("✅ آیتم فایلی اضافه شد.", { reply_markup: backTo("adm:content") });
          return;
        }

        // لینک؟
        const t = ctx.text?.trim();
        if (t && /^https?:\/\//i.test(t)) {
          await addLinkItem({
            sectionId: action.sectionId,
            title: action.title,
            description: action.desc,
            url: t,
          });
          clearAdmin(uid);
          await ctx.send("✅ آیتم لینکی اضافه شد.", { reply_markup: backTo("adm:content") });
          return;
        }

        await ctx.send("یا یک لینک معتبر (با http) بفرست، یا یک فایل.");
        return;
      }
    }
  });
}
