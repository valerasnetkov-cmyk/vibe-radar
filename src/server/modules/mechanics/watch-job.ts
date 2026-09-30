import { getDatabase } from "@/server/db/client";
import { loadEnvironment } from "@/server/config/env";
import { runTrackWatchAlerts } from "@/server/modules/mechanics/watch-alerts";
import { parseRadarWatchTracks } from "@/server/modules/mechanics/radar-tracks";
import { TelegramPublisher } from "@/server/modules/telegram/publisher";

export async function runConfiguredTrackWatchAlerts(): Promise<void> {
  const config = loadEnvironment();
  const watchedTracks = parseRadarWatchTracks(config.RADAR_WATCH_TRACKS);
  if (watchedTracks.length === 0) return;
  if (!config.TELEGRAM_BOT_TOKEN || !config.TELEGRAM_EDITOR_CHAT_ID) {
    throw new Error("Track watch Telegram configuration is incomplete");
  }

  const publisher = new TelegramPublisher({
    token: config.TELEGRAM_BOT_TOKEN,
    timeoutMs: config.TELEGRAM_API_TIMEOUT_MS,
  });
  await runTrackWatchAlerts(getDatabase(), {
    profileKey: "operator-default",
    watchedTracks,
    chatId: config.TELEGRAM_EDITOR_CHAT_ID,
    publisher,
  });
}
