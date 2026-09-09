import { and, asc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { sections, contentItems, settings } from "../db/schema.js";

export async function getActiveSections() {
  return db
    .select()
    .from(sections)
    .where(eq(sections.isActive, true))
    .orderBy(asc(sections.sortOrder));
}

export async function getSectionByKey(key: string) {
  const [row] = await db.select().from(sections).where(eq(sections.key, key));
  return row ?? null;
}

export async function getSectionItems(sectionId: number) {
  return db
    .select()
    .from(contentItems)
    .where(
      and(eq(contentItems.sectionId, sectionId), eq(contentItems.isActive, true))
    )
    .orderBy(asc(contentItems.sortOrder));
}

export async function getItemById(id: number) {
  const [row] = await db.select().from(contentItems).where(eq(contentItems.id, id));
  return row ?? null;
}

export async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}
