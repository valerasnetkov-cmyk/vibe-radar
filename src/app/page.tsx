import { getPublishedRadar } from "@/server/modules/publishing/read-model";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let entries: Awaited<ReturnType<typeof getPublishedRadar>> | null = null;
  try {
    entries = await getPublishedRadar(undefined, 5);
  } catch {
    entries = null;
  }
  return (
    <main className="shell">
      <header className="header">
        <a className="wordmark" href="/">
          VibeRadar
        </a>
        <span className="stage">РАДАР</span>
      </header>
      <section className="intro">
        <p className="eyebrow">Технологическая разведка для builders</p>
        <h1>Что растёт. Почему это важно. Что можно построить.</h1>
        <p className="lede">Радар показывает только опубликованные проверенные проекты.</p>
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
        <section className="records" aria-label="Растёт сейчас">
          {entries.map((entry) => (
            <article className="record" key={entry.candidateId}>
              <div>
                <p className="eyebrow">{entry.format}</p>
                <h2>
                  <a href={`/projects/${entry.slug}`}>{entry.title}</a>
                </h2>
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
        <span>VibeRadar</span>
        <a href="/radar">Весь радар</a>
      </footer>
    </main>
  );
}
