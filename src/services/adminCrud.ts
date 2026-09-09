import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { sections, contentItems, consultRequests } from "../db/schema.js";

/* ── بخش‌ها ──────────────────────────────────────────────── */
export async function listAllSections() {
  return db.select().from(sections).orderBy(asc(sections.sortOrder));
}

export async function getSection(id: number) {
  const [row] = await db.select().from(sections).where(eq(sections.id, id));
  return row ?? null;
}

export async function updateSectionTitle(id: number, title: string) {
  await db
    .update(sections)
    .set({ title, updatedAt: new Date() })
    .where(eq(sections.id, id));
}

export async function updateSectionIntro(id: number, intro: string) {
  await db
    .update(sections)
    .set({ intro, updatedAt: new Date() })
    .where(eq(sections.id, id));
}

export async function updateSectionEmoji(id: number, emoji: string) {
  await db
    .update(sections)
    .set({ emoji, updatedAt: new Date() })
    .where(eq(sections.id, id));
}

export async function updateSectionStyle(id: number, style: string | null) {
  await db
    .update(sections)
    .set({ style, updatedAt: new Date() })
    .where(eq(sections.id, id));
}

export async function toggleSection(id: number, isActive: boolean) {
  await db
    .update(sections)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(sections.id, id));
}

/* ── آیتم‌های محتوا ──────────────────────────────────────── */
export async function listItems(sectionId: number) {
  return db
    .select()
    .from(contentItems)
    .where(eq(contentItems.sectionId, sectionId))
    .orderBy(asc(contentItems.sortOrder));
}

export async function addLinkItem(input: {
  sectionId: number;
  title: string;
  description: string;
  url: string;
}) {
  const [{ maxOrder }] = await db
    .select({ maxOrder: contentItems.sortOrder })
    .from(contentItems)
    .where(eq(contentItems.sectionId, input.sectionId))
    .orderBy(desc(contentItems.sortOrder))
    .limit(1)
    .then((r) => (r.length ? r : [{ maxOrder: 0 }]));

  await db.insert(contentItems).values({
    sectionId: input.sectionId,
    title: input.title,
    description: input.description || null,
    kind: "link",
    url: input.url,
    sortOrder: (maxOrder ?? 0) + 10,
  });
}

export async function addFileItem(input: {
  sectionId: number;
  title: string;
  description: string;
  fileId: string;
  fileKind: "audio" | "video" | "photo" | "document" | "voice";
}) {
  const [{ maxOrder }] = await db
    .select({ maxOrder: contentItems.sortOrder })
    .from(contentItems)
    .where(eq(contentItems.sectionId, input.sectionId))
    .orderBy(desc(contentItems.sortOrder))
    .limit(1)
    .then((r) => (r.length ? r : [{ maxOrder: 0 }]));

  await db.insert(contentItems).values({
    sectionId: input.sectionId,
    title: input.title,
    description: input.description || null,
    kind: "file",
    fileId: input.fileId,
    fileKind: input.fileKind,
    sortOrder: (maxOrder ?? 0) + 10,
  });
}

export async function deleteItem(id: number) {
  await db.delete(contentItems).where(eq(contentItems.id, id));
}

export async function toggleItem(id: number, isActive: boolean) {
  await db
    .update(contentItems)
    .set({ isActive })
    .where(eq(contentItems.id, id));
}

/* ── درخواست‌های مشاوره ──────────────────────────────────── */
export async function listConsultRequests(limit = 10) {
  return db
    .select()
    .from(consultRequests)
    .orderBy(desc(consultRequests.createdAt))
    .limit(limit);
}
