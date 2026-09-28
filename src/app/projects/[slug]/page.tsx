import { notFound } from "next/navigation";
import { getPublishedProject } from "@/server/modules/publishing/read-model";

export const dynamic = "force-dynamic";

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let record: Awaited<ReturnType<typeof getPublishedProject>>;
  try {
    record = await getPublishedProject(undefined, slug);
  } catch {
    record = null;
  }
  if (!record) notFound();
  const { content } = record;
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
        <p className="eyebrow">Проект / {record.slug}</p>
        <h1>{record.name}</h1>
        <p className="lede">{content.shortSummary}</p>
        <p>
          <a href={content.projectUrl} rel="noopener noreferrer">
            Источник проекта
          </a>
        </p>
      </section>
      <section className="records" aria-label="Метрики проекта">
        <article className="record">
          <div>
            <p className="eyebrow">Оценка</p>
            <h2>VIBE SCORE</h2>
          </div>
          <dl>
            <div>
              <dt>Score</dt>
              <dd>{content.score.toFixed(1)}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{content.scoreVersion}</dd>
            </div>
            <div>
              <dt>Confidence</dt>
              <dd>
                {content.confidence.toFixed(0)} · {content.confidenceLevel}
              </dd>
            </div>
          </dl>
        </article>
      </section>
      <section className="intro">
        <p className="eyebrow">Почему сейчас</p>
        <p className="lede">{content.whyNow}</p>
      </section>
      {content.keyPoints.length > 0 && (
        <section className="intro">
          <p className="eyebrow">Ключевое</p>
          <ul>
            {content.keyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>
      )}
      {content.limitations.length > 0 && (
        <section className="intro">
          <p className="eyebrow">Ограничения</p>
          <ul>
            {content.limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}
      {content.buildability && (
        <section className="intro">
          <p className="eyebrow">Buildability · {content.buildability.label}</p>
          <p className="lede">{content.buildability.explanation}</p>
        </section>
      )}
      {content.sources.length > 0 && (
        <section className="intro">
          <p className="eyebrow">Источники</p>
          <ul>
            {content.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} rel="noopener noreferrer">
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <footer className="footer">
        <span>Опубликовано {formatDate(record.publishedAt)}</span>
        <a href="/radar">К радару</a>
      </footer>
    </main>
  );
}
