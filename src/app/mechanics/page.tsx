import { listPublicMechanics } from "@/server/modules/mechanics/public-read-model";
import { normalizeRadarTrack, radarTrackSchema } from "@/server/modules/mechanics/radar-tracks";

export const dynamic = "force-dynamic";

const TRACK_LABELS: Record<string, string> = {
  AGENT_INTERFACE: "Agent Interface",
  AGENT_RUNTIME: "Agent Runtime",
  AGENT_SECURITY: "Agent Security",
  AGENT_TESTING: "Agent Testing",
  AGENT_ECONOMY: "Agent Economy",
  AGENT_TRUTH: "Agent Truth",
  AGENT_EXPERIENCE: "Agent Experience",
  GENERATIVE_UI: "Generative UI",
  SMALL_SOFTWARE: "Small Software",
  CRYPTO_PQ: "Crypto / PQ",
  WEB_PLATFORM: "Web Platform",
};

function formatDate(value: string): string {
  return value.slice(0, 10);
}

type MechanicsPageProps = {
  searchParams?: Promise<{ track?: string | string[] }>;
};

export default async function MechanicsPage({ searchParams }: MechanicsPageProps) {
  const params = await searchParams;
  const rawTrack = Array.isArray(params?.track) ? params.track[0] : params?.track;
  const selectedTrack = rawTrack ? normalizeRadarTrack(rawTrack) : null;

  let mechanics: Awaited<ReturnType<typeof listPublicMechanics>> | null = null;
  try {
    mechanics = await listPublicMechanics();
  } catch {
    mechanics = null;
  }

  const visibleMechanics =
    mechanics && selectedTrack
      ? mechanics.filter((mechanic) => mechanic.radarTracks.includes(selectedTrack))
      : mechanics;

  return (
    <main className="shell">
      <header className="header">
        <a className="wordmark" href="/">
          VibeRadar
        </a>
        <nav>
          <a href="/radar">Радар</a> · <a href="/mechanics">Механики</a> ·{" "}
          <a href="/opportunities">Возможности</a> · <a href="/methodology">Методология</a>
        </nav>
      </header>
      <section className="intro">
        <p className="eyebrow">Product Mechanic Radar</p>
        <h1>Повторяющиеся механики без поспешных трендов.</h1>
        <p className="lede">
          Публичными становятся только механики с независимыми источниками, traceable evidence и
          проверенным lifecycle.
        </p>
        <nav aria-label="Фильтр по технологическому треку">
          <a href="/mechanics" aria-current={selectedTrack === null ? "page" : undefined}>
            Все
          </a>
          {" · "}
          {radarTrackSchema.options.map((track, index) => (
            <span key={track}>
              {index > 0 && " · "}
              <a
                href={`/mechanics?track=${encodeURIComponent(track)}`}
                aria-current={selectedTrack === track ? "page" : undefined}
              >
                {TRACK_LABELS[track] ?? track}
              </a>
            </span>
          ))}
        </nav>
      </section>
      <section className="records" aria-live="polite">
        {visibleMechanics === null ? (
          <p className="muted">Данные временно недоступны.</p>
        ) : visibleMechanics.length === 0 ? (
          <p className="muted">
            {selectedTrack
              ? `В треке ${TRACK_LABELS[selectedTrack] ?? selectedTrack} пока нет публичных механик.`
              : "Публичных механик пока нет. Данные появятся после editor review и проверки независимых evidence."}
          </p>
        ) : (
          visibleMechanics.map((mechanic) => (
            <article className="record" key={mechanic.id}>
              <div>
                <p className="eyebrow">{mechanic.stage}</p>
                <h2>{mechanic.name}</h2>
                <p className="muted">{mechanic.description}</p>
                {mechanic.radarTracks.length > 0 && (
                  <p className="record-link">
                    Треки:{" "}
                    {mechanic.radarTracks.map((track) => TRACK_LABELS[track] ?? track).join(", ")}
                  </p>
                )}
                <p className="record-link">
                  Независимых реализаций: {mechanic.independentSourceCount} · Наблюдений:{" "}
                  {mechanic.evidenceCount}
                  {mechanic.categories.length > 0 && ` · ${mechanic.categories.join(", ")}`}
                </p>
                {mechanic.practicalImplications.length > 0 && (
                  <p className="muted">Применение: {mechanic.practicalImplications.join("; ")}</p>
                )}
                {mechanic.risks.length > 0 && (
                  <p className="muted">Риски: {mechanic.risks.join("; ")}</p>
                )}
                {mechanic.sources.length > 0 && (
                  <p className="record-link">
                    Источники:{" "}
                    {mechanic.sources.map((source, index) => (
                      <span key={source.projectSlug}>
                        {index > 0 && ", "}
                        <a href={`/projects/${source.projectSlug}`}>{source.projectName}</a>
                      </span>
                    ))}
                  </p>
                )}
              </div>
              <dl>
                <div>
                  <dt>Velocity</dt>
                  <dd>{mechanic.velocity}</dd>
                </div>
                <div>
                  <dt>Confidence</dt>
                  <dd>{mechanic.confidence}</dd>
                </div>
                <div>
                  <dt>Наблюдается</dt>
                  <dd>{formatDate(mechanic.lastObservedAt)}</dd>
                </div>
              </dl>
            </article>
          ))
        )}
      </section>
      <footer className="footer">
        <a href="/">На главную</a>
      </footer>
    </main>
  );
}
