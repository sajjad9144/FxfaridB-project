import { db } from "./index.js";
import { sections, settings } from "./schema.js";
import { sql } from "drizzle-orm";

/**
 * ۸ بخش ثابت (حالت A). این‌ها یک‌بار ساخته می‌شوند.
 * عنوان و توضیح‌شان بعداً از پنل ادمین قابل تغییر است، ولی key ثابت می‌ماند.
 * چیدمان صفحه اول از sortOrder + fullWidth ساخته می‌شود:
 *
 *   [ جدیدترین پادکست‌ها ]        (fullWidth)
 *   [ بررسی استیتمنت | ژورنال‌نویسی ]
 *   [ توسعه فردی    | خلاصه کتاب  ]
 *   [ انگیزشی       | موارد دیگر  ]
 *   [ درخواست مشاوره ]           (fullWidth، فلوی خاص)
 */
const SECTIONS = [
  { key: "podcasts",   title: "جدیدترین پادکست‌ها", sortOrder: 10, fullWidth: true },
  { key: "statement",  title: "بررسی استیتمنت",     sortOrder: 20, fullWidth: false },
  { key: "journal",    title: "ژورنال‌نویسی",        sortOrder: 30, fullWidth: false },
  { key: "growth",     title: "توسعه فردی",         sortOrder: 40, fullWidth: false },
  { key: "books",      title: "خلاصه کتاب",         sortOrder: 50, fullWidth: false },
  { key: "motivation", title: "انگیزشی",            sortOrder: 60, fullWidth: false },
  { key: "misc",       title: "موارد دیگر",         sortOrder: 70, fullWidth: false },
  { key: "consult",    title: "درخواست مشاوره",      sortOrder: 80, fullWidth: true },
];

const DEFAULT_SETTINGS = [
  { key: "welcome_text", value: "به ربات FX FARID خوش آمدی 🌱\nیکی از بخش‌ها را انتخاب کن:" },
  { key: "consult_tariff_text", value: "تعرفه مشاوره را owner از پنل ادمین وارد می‌کند." },
  { key: "consult_voice_file_id", value: "" },
  { key: "contact_text", value: "متن ارتباط با ما را owner وارد می‌کند." },
];

async function seed() {
  for (const s of SECTIONS) {
    await db
      .insert(sections)
      .values(s)
      .onConflictDoNothing({ target: sections.key });
  }
  for (const s of DEFAULT_SETTINGS) {
    await db
      .insert(settings)
      .values(s)
      .onConflictDoNothing({ target: settings.key });
  }
  console.log("✅ بخش‌ها و تنظیمات پیش‌فرض ساخته شدند.");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
