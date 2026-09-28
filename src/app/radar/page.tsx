import { getPublishedRadar } from "@/server/modules/publishing/read-model";

export const dynamic = "force-dynamic";

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export default async function RadarPage() {
  let entries: Awaited<ReturnType<typeof getPublishedRadar>> | null = null;
  try {
    entries = await getPublishedRadar();
  } catch {
    entries = null;
  }
  return (
    <main className="shell">
      <header className="header">
        <a className="wordmark" href="/">
          VibeRadar
        </a>
        <nav>
          <a href="/radar">Радар</a> · <a href="/methodology">Методология</a>
        </nav>
      </header>
      <section className="intro">
        <p className="eyebrow">Радар</p>
        <h1>Опубликованные проекты.</h1>
        <p className="lede">
          Только проверенные проекты: score, confidence и подтверждённые источники.
        </p>
      </section>
      {entries === null ? (
        <section className="intro">
          <p className="lede">Данные временно недоступны.</p>
        </section>
      ) : entries.length === 0 ? (
        <section className="intro">
          <p className="lede">No published radar entries yet.</p>
        </section>
      ) : (
        <section className="records" aria-label="Опубликованный радар">
          {entries.map((entry) => (
            <article className="record" key={entry.candidateId}>
              <div>
                <p className="eyebrow">{entry.format}</p>
                <h2>
                  <a href={`/projects/${entry.slug}`}>{entry.title}</a>
                </h2>
                <p className="record-link">Опубликовано {formatDate(entry.publishedAt)}</p>
              </div>
              <dl>
                <div>
                  <dt>Vibe</dt>
                  <dd>{entry.score.toFixed(1)}</dd>
                </div>
                <div>
                  <dt>Confidence</dt>
                  <dd>{entry.confidence.toFixed(0)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </section>
      )}
      <footer className="footer">
        <a href="/">На главную</a>
      </footer>
    </main>
  );
}
