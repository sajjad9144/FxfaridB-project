import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { config } from "../config/index.js";

export async function upsertUser(input: {
  telegramId: number;
  username?: string | null;
  firstName?: string | null;
}) {
  const isAdmin = config.adminIds.includes(input.telegramId);
  const [row] = await db
    .insert(users)
    .values({
      telegramId: input.telegramId,
      username: input.username ?? null,
      firstName: input.firstName ?? null,
      isAdmin,
    })
    .onConflictDoUpdate({
      target: users.telegramId,
      set: {
        username: input.username ?? null,
        firstName: input.firstName ?? null,
        isAdmin,
      },
    })
    .returning();
  return row;
}

export function isAdmin(telegramId: number): boolean {
  return config.adminIds.includes(telegramId);
}
