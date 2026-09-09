import {
  pgTable,
  serial,
  bigint,
  text,
  varchar,
  boolean,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

/**
 * ─────────────────────────────────────────────────────────────
 *  FX FARID — Trading Psychology Bot
 *  Database schema (Drizzle ORM + Postgres)
 *
 *  طراحی: حالت A — ساختار ثابت، محتوای کاملاً قابل ویرایش از پنل ادمین.
 *  هشت بخش از پیش تعریف‌شده‌اند (sections)، ولی عنوان/متن/آیتم‌ها/وضعیت‌شان
 *  همگی رکورد دیتابیس‌اند و owner از داخل تلگرام تغییرشان می‌دهد.
 * ─────────────────────────────────────────────────────────────
 */

// نوع محتوای هر آیتم: لینک بیرونی یا فایل آپلودی روی تلگرام
export const contentKind = pgEnum("content_kind", ["link", "file"]);

// نوع فایل تلگرام (وقتی kind = file)
export const fileType = pgEnum("file_type", [
  "audio",
  "video",
  "photo",
  "document",
  "voice",
]);

// وضعیت یک درخواست مشاوره
export const consultStatus = pgEnum("consult_status", [
  "new",
  "seen",
  "done",
  "rejected",
]);

/* ── کاربران ─────────────────────────────────────────────── */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: bigint("telegram_id", { mode: "number" }).notNull().unique(),
  username: varchar("username", { length: 64 }),
  firstName: varchar("first_name", { length: 128 }),
  isAdmin: boolean("is_admin").notNull().default(false),
  isBlocked: boolean("is_blocked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── بخش‌ها (۸ بخش ثابت صفحه اول) ────────────────────────── */
// هر ردیف = یک دکمه‌ی منوی اصلی. کلید ثابت است (kind می‌ماند)،
// ولی title/intro/isActive قابل ویرایش‌اند. sortOrder چیدمان را می‌سازد.
export const sections = pgTable("sections", {
  id: serial("id").primaryKey(),
  // کلید داخلی ثابت، در کد به آن ارجاع می‌دهیم؛ owner آن را عوض نمی‌کند
  key: varchar("key", { length: 32 }).notNull().unique(),
  // عنوان دکمه — قابل ویرایش
  title: varchar("title", { length: 128 }).notNull(),
  emoji: varchar("emoji", { length: 16 }),
  style: varchar("style", { length: 16 }),
  // متن توضیح که بالای لیست آیتم‌ها نشان داده می‌شود — قابل ویرایش
  intro: text("intro"),
  // ترتیب و چیدمان در صفحه اول
  sortOrder: integer("sort_order").notNull().default(0),
  // دکمه تمام‌عرض باشد؟ (پادکست‌ها و مشاوره = true)
  fullWidth: boolean("full_width").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── آیتم‌های محتوا (پادکست/ویدیو/مقاله داخل هر بخش) ──────── */
export const contentItems = pgTable("content_items", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id")
    .notNull()
    .references(() => sections.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),

  kind: contentKind("kind").notNull(), // link | file

  // وقتی kind = link
  url: text("url"),

  // وقتی kind = file
  fileId: text("file_id"),
  fileKind: fileType("file_kind"),

  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── تنظیمات کلید-مقدار (متن‌های عمومی، ویس مشاوره، تعرفه) ── */
// مثال کلیدها:
//   welcome_text            متن /start
//   consult_voice_file_id   ویس بخش مشاوره
//   consult_tariff_text     متن تعرفه
//   contact_text            متن ارتباط با ما
export const settings = pgTable("settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── درخواست‌های مشاوره ──────────────────────────────────── */
export const consultRequests = pgTable("consult_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fullName: varchar("full_name", { length: 128 }),
  email: varchar("email", { length: 128 }),
  telegramHandle: varchar("telegram_handle", { length: 64 }),
  note: text("note"),
  status: consultStatus("status").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
