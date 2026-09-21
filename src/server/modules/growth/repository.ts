import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { projectSnapshots } from "@/server/db/schema";
import { calculateGrowth } from "@/server/modules/growth/calculate";

export async function calculateProjectGrowth(projectId: string) {
  const snapshots = await getDatabase()
    .select({ observedAt: projectSnapshots.observedAt, stars: projectSnapshots.stars })
    .from(projectSnapshots)
    .where(eq(projectSnapshots.projectId, projectId))
    .orderBy(desc(projectSnapshots.observedAt));
  return calculateGrowth(snapshots.reverse());
}
