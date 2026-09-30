import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { trackWatchProfiles, trackWatchStates } from "@/server/db/schema";
import {
  listPublicMechanics,
  type PublicMechanic,
} from "@/server/modules/mechanics/public-read-model";
import type { RadarTrack } from "@/server/modules/mechanics/radar-tracks";
import { boundTelegramMessage } from "@/server/modules/telegram/renderer";

export const WATCH_VELOCITY_DELTA = 20;
export const WATCH_CONFIDENCE_DELTA = 15;
export const WATCH_MAX_ALERTS_PER_RUN = 10;

export type WatchAlertReason = "NEW" | "STAGE_CHANGE" | "VELOCITY_CHANGE" | "CONFIDENCE_CHANGE";

export type WatchSnapshot = {
  stage: string;
  velocity: number;
  confidence: number;
};

export type WatchDecision = {
  shouldAlert: boolean;
  reason: WatchAlertReason | null;
};

export function decideWatchAlert(
  previous: WatchSnapshot | null,
  current: WatchSnapshot,
): WatchDecision {
  if (!previous) return { shouldAlert: true, reason: "NEW" };
  if (previous.stage !== current.stage) return { shouldAlert: true, reason: "STAGE_CHANGE" };
  if (Math.abs(previous.velocity - current.velocity) >= WATCH_VELOCITY_DELTA) {
    return { shouldAlert: true, reason: "VELOCITY_CHANGE" };
  }
  if (Math.abs(previous.confidence - current.confidence) >= WATCH_CONFIDENCE_DELTA) {
    return { shouldAlert: true, reason: "CONFIDENCE_CHANGE" };
  }
  return { shouldAlert: false, reason: null };
}

export function mechanicMatchesWatch(
  mechanic: Pick<PublicMechanic, "radarTracks">,
  watchedTracks: readonly RadarTrack[],
): boolean {
  const watched = new Set(watchedTracks);
  return mechanic.radarTracks.some((track) => watched.has(track as RadarTrack));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function reasonLabel(reason: WatchAlertReason): string {
  if (reason === "NEW") return "Новая подтверждённая механика";
  if (reason === "STAGE_CHANGE") return "Изменился lifecycle stage";
  if (reason === "VELOCITY_CHANGE") return "Существенно изменилась velocity";
  return "Существенно изменилась confidence";
}

export function renderTrackWatchAlert(
  mechanic: PublicMechanic,
  reason: WatchAlertReason,
): string {
  const tracks = mechanic.radarTracks.map(escapeHtml).join(", ");
  const message = [
    "<b>VibeRadar Watch</b>",
    `<b>${escapeHtml(mechanic.name)}</b>`,
    "",
    escapeHtml(reasonLabel(reason)),
    escapeHtml(mechanic.description),
    "",
    `Tracks: ${tracks}`,
    `Stage: <b>${escapeHtml(mechanic.stage)}</b>`,
    `Velocity: <b>${mechanic.velocity}</b> · Confidence: <b>${mechanic.confidence}</b>`,
    `Evidence: ${mechanic.independentSourceCount} independent sources`,
  ].join("\n");
  return boundTelegramMessage(message);
}

async function baselineWatchProfile(
  database: ReturnType<typeof getDatabase>,
  profileKey: string,
  mechanics: PublicMechanic[],
): Promise<void> {
  await database.transaction(async (transaction) => {
    for (const mechanic of mechanics) {
      await transaction
        .insert(trackWatchStates)
        .values({
          profileKey,
          mechanicId: mechanic.id,
          lastStage: mechanic.stage,
          lastVelocity: mechanic.velocity,
          lastConfidence: mechanic.confidence,
          checkpointAt: new Date(),
        })
        .onConflictDoNothing();
    }
    await transaction
      .insert(trackWatchProfiles)
      .values({ profileKey, initializedAt: new Date() })
      .onConflictDoNothing();
  });
}

export async function runTrackWatchAlerts(
  database: ReturnType<typeof getDatabase>,
  input: {
    profileKey: string;
    watchedTracks: RadarTrack[];
    chatId: string;
    publisher: { publish(chatId: string, html: string): Promise<{ providerMessageId: string }> };
  },
): Promise<{ sent: number; matched: number }> {
  if (input.watchedTracks.length === 0) return { sent: 0, matched: 0 };

  const matched = (await listPublicMechanics(database)).filter((mechanic) =>
    mechanicMatchesWatch(mechanic, input.watchedTracks),
  );

  const [profile] = await database
    .select({ profileKey: trackWatchProfiles.profileKey })
    .from(trackWatchProfiles)
    .where(eq(trackWatchProfiles.profileKey, input.profileKey))
    .limit(1);
  if (!profile) {
    await baselineWatchProfile(database, input.profileKey, matched);
    return { sent: 0, matched: matched.length };
  }

  let sent = 0;
  for (const mechanic of matched) {
    if (sent >= WATCH_MAX_ALERTS_PER_RUN) break;
    const [previous] = await database
      .select({
        lastStage: trackWatchStates.lastStage,
        lastVelocity: trackWatchStates.lastVelocity,
        lastConfidence: trackWatchStates.lastConfidence,
      })
      .from(trackWatchStates)
      .where(
        and(
          eq(trackWatchStates.profileKey, input.profileKey),
          eq(trackWatchStates.mechanicId, mechanic.id),
        ),
      )
      .limit(1);

    const decision = decideWatchAlert(
      previous
        ? {
            stage: previous.lastStage,
            velocity: previous.lastVelocity,
            confidence: previous.lastConfidence,
          }
        : null,
      {
        stage: mechanic.stage,
        velocity: mechanic.velocity,
        confidence: mechanic.confidence,
      },
    );
    if (!decision.shouldAlert || !decision.reason) continue;

    const delivery = await input.publisher.publish(
      input.chatId,
      renderTrackWatchAlert(mechanic, decision.reason),
    );

    await database
      .insert(trackWatchStates)
      .values({
        profileKey: input.profileKey,
        mechanicId: mechanic.id,
        lastStage: mechanic.stage,
        lastVelocity: mechanic.velocity,
        lastConfidence: mechanic.confidence,
        providerMessageId: delivery.providerMessageId,
        checkpointAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [trackWatchStates.profileKey, trackWatchStates.mechanicId],
        set: {
          lastStage: mechanic.stage,
          lastVelocity: mechanic.velocity,
          lastConfidence: mechanic.confidence,
          providerMessageId: delivery.providerMessageId,
          checkpointAt: new Date(),
        },
      });
    sent += 1;
  }

  return { sent, matched: matched.length };
}
