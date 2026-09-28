import { listPublicMechanics } from "@/server/modules/mechanics/public-read-model";

export const dynamic = "force-dynamic";

function formatDate(value: string): string {
  return value.slice(0, 10);
}

export default async function MechanicsPage() {
  let mechanics: Awaited<ReturnType<typeof listPublicMechanics>> | null = null;
  try {
    mechanics = await listPublicMechanics();
  } catch {
    mechanics = null;
  }
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
      </section>
      <section className="records" aria-live="polite">
        {mechanics === null ? (
          <p className="muted">Данные временно недоступны.</p>
        ) : mechanics.length === 0 ? (
          <p className="muted">
            Публичных механик пока нет. Данные появятся после editor review и проверки независимых
            evidence.
          </p>
        ) : (
          mechanics.map((mechanic) => (
            <article className="record" key={mechanic.id}>
              <div>
                <p className="eyebrow">{mechanic.stage}</p>
                <h2>{mechanic.name}</h2>
                <p className="muted">{mechanic.description}</p>
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
