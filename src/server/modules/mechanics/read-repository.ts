import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { productMechanics } from "@/server/db/schema";

export async function listPublicMechanics() {
  return getDatabase()
    .select({
      id: productMechanics.id,
      name: productMechanics.canonicalName,
      description: productMechanics.description,
      stage: productMechanics.stage,
      velocity: productMechanics.velocity,
      confidence: productMechanics.confidence,
      categories: productMechanics.affectedCategories,
    })
    .from(productMechanics)
    .where(eq(productMechanics.status, "ACTIVE"))
    .orderBy(desc(productMechanics.lastObservedAt))
    .limit(50);
}
