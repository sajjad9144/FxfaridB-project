import { InlineKeyboard } from "gramio";
import type { sections as SectionsTable, contentItems as ItemsTable } from "../db/schema.js";

type Section = typeof SectionsTable.$inferSelect;
type ContentItem = typeof ItemsTable.$inferSelect;

const PAGE_SIZE = 5;

/**
 * منوی اصلی — از روی رکوردهای فعال sections ساخته می‌شود.
 * دکمه‌های fullWidth یک ردیف کامل می‌گیرند، بقیه دو‌تایی در هر ردیف.
 * چون رنگ دکمه (style، از Bot API 9.4) در builder گرامیو نیست،
 * markup را دستی می‌سازیم تا فیلد style را بپذیرد.
 */
type RawBtn = { text: string; callback_data: string; style?: string };

export function mainMenu(activeSections: Section[], isAdmin = false): { inline_keyboard: RawBtn[][] } {
  const sorted = [...activeSections].sort((a, b) => a.sortOrder - b.sortOrder);
  const label = (x: Section) => (x.emoji ? `${x.emoji} ${x.title}` : x.title);
  const btn = (s: Section): RawBtn => {
    const b: RawBtn = { text: label(s), callback_data: `sec:${s.key}:0` };
    if (s.style) b.style = s.style; // primary | success | danger
    return b;
  };

  const rows: RawBtn[][] = [];
  let pendingHalf: Section | null = null;

  for (const s of sorted) {
    if (s.fullWidth) {
      if (pendingHalf) { rows.push([btn(pendingHalf)]); pendingHalf = null; }
      rows.push([btn(s)]);
    } else if (pendingHalf) {
      rows.push([btn(pendingHalf), btn(s)]);
      pendingHalf = null;
    } else {
      pendingHalf = s;
    }
  }
  if (pendingHalf) rows.push([btn(pendingHalf)]);

  if (isAdmin) rows.push([{ text: "⚙️ پنل مدیریت", callback_data: "adm:home" }]);
  return { inline_keyboard: rows };
}

/**
 * صفحه یک بخش محتوایی: لیست آیتم‌ها + صفحه‌بندی + بازگشت.
 */
export function sectionPage(
  sectionKey: string,
  items: ContentItem[],
  page: number
): InlineKeyboard {
  const kb = new InlineKeyboard();
  const start = page * PAGE_SIZE;
  const slice = items.slice(start, start + PAGE_SIZE);

  for (const it of slice) {
    kb.text(it.title, `item:${it.id}`).row();
  }

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  if (totalPages > 1) {
    if (page > 0) kb.text("◀️", `sec:${sectionKey}:${page - 1}`);
    kb.text(`${page + 1}/${totalPages}`, "noop");
    if (page < totalPages - 1) kb.text("▶️", `sec:${sectionKey}:${page + 1}`);
    kb.row();
  }

  kb.text("🏠 منوی اصلی", "home");
  return kb;
}

/** صفحه یک آیتم: دکمه لینک (اگر لینک باشد) + بازگشت به بخش */
export function itemPage(item: ContentItem): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (item.kind === "link" && item.url) {
    kb.url("🔗 مشاهده", item.url).row();
  }
  kb.text("🏠 منوی اصلی", "home");
  return kb;
}

/** بخش مشاوره: تعرفه + ثبت درخواست */
export function consultMenu(): InlineKeyboard {
  return new InlineKeyboard()
    .text("💰 تعرفه", "consult:tariff")
    .row()
    .text("📝 ثبت درخواست", "consult:start")
    .row()
    .text("🏠 منوی اصلی", "home");
}

export { PAGE_SIZE };
