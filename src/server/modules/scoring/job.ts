import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { projectSnapshots, projects } from "@/server/db/schema";
import { assessConfidence } from "@/server/modules/confidence/assess";
import { calculateGrowth } from "@/server/modules/growth/calculate";
import { persistConfidence, persistScore } from "@/server/modules/scoring/repository";
import { calculateVibeScore, growthComponent } from "@/server/modules/scoring/vibe-score";

export async function runConfiguredScoreCalculation(): Promise<void> {
  const database = getDatabase();
  const projectRows = await database
    .select({ id: projects.id, firstSeenAt: projects.firstSeenAt })
    .from(projects)
    .where(eq(projects.status, "active"));
  for (const project of projectRows) {
    const snapshots = await database
      .select({ observedAt: projectSnapshots.observedAt, stars: projectSnapshots.stars })
      .from(projectSnapshots)
      .where(eq(projectSnapshots.projectId, project.id))
      .orderBy(desc(projectSnapshots.observedAt));
    const orderedSnapshots = snapshots.reverse();
    if (!orderedSnapshots.length) continue;
    const growth = calculateGrowth(orderedSnapshots);
    const ageDays = Math.max(0, (Date.now() - project.firstSeenAt.getTime()) / 86400000);
    const score = calculateVibeScore({
      components: {
        growth: growthComponent(growth),
        vibeRelevance: 0,
        freshness: Math.max(0, 100 - (ageDays / 365) * 100),
        developmentActivity: 0,
        community: 0,
        documentation: 0,
        originality: 0,
      },
    });
    const confidence = assessConfidence({
      evidenceCount: orderedSnapshots.length,
      sourceCount: orderedSnapshots.length ? 1 : 0,
      snapshotCount: orderedSnapshots.length,
      hasCurrentSnapshot: orderedSnapshots.length > 0,
      hasRequiredHistory: growth.sevenDays.status === "AVAILABLE",
      contradictionCount: 0,
    });
    await persistScore(project.id, score);
    await persistConfidence(project.id, confidence);
  }
}
