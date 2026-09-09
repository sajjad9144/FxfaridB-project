import { db } from "../db/index.js";
import { consultRequests, users } from "../db/schema.js";
import { eq } from "drizzle-orm";

export type ConsultStep = "name" | "email" | "handle" | "note";

// وضعیت فرم مشاوره در حافظه (ساده و کافی). برای مقیاس بزرگ‌تر می‌توان به Redis برد.
export const consultSessions = new Map<
  number,
  { step: ConsultStep; data: Partial<{ name: string; email: string; handle: string; note: string }> }
>();

export async function saveConsult(input: {
  telegramId: number;
  fullName: string;
  email: string;
  telegramHandle: string;
  note?: string;
}) {
  const [u] = await db.select().from(users).where(eq(users.telegramId, input.telegramId));
  if (!u) throw new Error("user not found");

  const [row] = await db
    .insert(consultRequests)
    .values({
      userId: u.id,
      fullName: input.fullName,
      email: input.email,
      telegramHandle: input.telegramHandle,
      note: input.note ?? null,
    })
    .returning();
  return row;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(s: string): boolean {
  return EMAIL_RE.test(s.trim());
}
