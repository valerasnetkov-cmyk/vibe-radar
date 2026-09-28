import { and, eq, sql } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { aiDailyUsage } from "@/server/db/schema";

const MAX_CONSUME_AMOUNT = 1000;

export function utcDayString(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * PostgreSQL-backed atomic AI daily budget. Consumption succeeds only when
 * the bounded usage row is created or incremented within the configured
 * limit, so concurrent workers and restarts share one durable counter and
 * the provider call happens only after the database grants the budget.
 */
export async function consumeAiDailyBudget(
  database: ReturnType<typeof getDatabase>,
  limit: number,
  amount = 1,
  now = new Date(),
): Promise<boolean> {
  if (!Number.isInteger(limit) || limit < 0) return false;
  if (!Number.isInteger(amount) || amount < 1 || amount > MAX_CONSUME_AMOUNT) return false;
  if (amount > limit) return false;
  const day = utcDayString(now);
  const [inserted] = await database
    .insert(aiDailyUsage)
    .values({ utcDay: day, usedCount: amount, updatedAt: now })
    .onConflictDoNothing({ target: aiDailyUsage.utcDay })
    .returning({ usedCount: aiDailyUsage.usedCount });
  if (inserted) return true;
  const [updated] = await database
    .update(aiDailyUsage)
    .set({ usedCount: sql`${aiDailyUsage.usedCount} + ${amount}`, updatedAt: now })
    .where(
      and(eq(aiDailyUsage.utcDay, day), sql`${aiDailyUsage.usedCount} + ${amount} <= ${limit}`),
    )
    .returning({ usedCount: aiDailyUsage.usedCount });
  return Boolean(updated);
}

export async function readAiDailyUsage(
  database: ReturnType<typeof getDatabase>,
  day: string = utcDayString(),
): Promise<{ used: number }> {
  const [row] = await database
    .select({ usedCount: aiDailyUsage.usedCount })
    .from(aiDailyUsage)
    .where(eq(aiDailyUsage.utcDay, day))
    .limit(1);
  return { used: row?.usedCount ?? 0 };
}
