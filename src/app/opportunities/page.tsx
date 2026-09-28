import { listPublicOpportunities } from "@/server/modules/opportunities/public-read-model";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  let opportunities: Awaited<ReturnType<typeof listPublicOpportunities>> | null = null;
  try {
    opportunities = await listPublicOpportunities();
  } catch {
    opportunities = null;
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
        <p className="eyebrow">Opportunity Engine · гипотеза</p>
        <h1>Что можно построить на проверенном сигнале.</h1>
        <p className="lede">
          Opportunity cards отделяют факты источника от продуктовой гипотезы и всегда показывают
          market scope, confidence и differentiation. Каждая карточка ниже — гипотеза, а не
          установленный факт.
        </p>
      </section>
      <section className="records" aria-live="polite">
        {opportunities === null ? (
          <p className="muted">Данные временно недоступны.</p>
        ) : opportunities.length === 0 ? (
          <p className="muted">public opportunities are not available yet.</p>
        ) : (
          opportunities.map((opportunity) => (
            <article className="record" key={opportunity.id}>
              <div>
                <p className="eyebrow">
                  Гипотеза · {opportunity.marketScope} · {opportunity.confidence} confidence ·{" "}
                  {opportunity.buildabilityLabel}
                </p>
                <h2>{opportunity.title}</h2>
                <p className="muted">{opportunity.problemStatement}</p>
                <p className="record-link">Продукт: {opportunity.proposedProduct}</p>
                <p className="record-link">Для кого: {opportunity.targetUser}</p>
                <p className="record-link">Гипотеза отличия: {opportunity.differentiation}</p>
                {opportunity.requiredCapabilities.length > 0 && (
                  <p className="record-link">
                    Потребуется: {opportunity.requiredCapabilities.join("; ")}
                  </p>
                )}
                {opportunity.risks.length > 0 && (
                  <p className="muted">Риски: {opportunity.risks.join("; ")}</p>
                )}
                {opportunity.evidence.length > 0 && (
                  <p className="record-link">
                    Evidence:{" "}
                    {opportunity.evidence.map((item, index) => (
                      <span key={`${item.kind}-${index}`}>
                        {index > 0 && ", "}
                        {item.kind === "PROJECT" ? (
                          <a href={`/projects/${item.slug}`}>{item.name}</a>
                        ) : (
                          <a href="/mechanics">{item.name}</a>
                        )}
                      </span>
                    ))}
                  </p>
                )}
              </div>
              <dl>
                <div>
                  <dt>Confidence</dt>
                  <dd>{opportunity.confidence}</dd>
                </div>
                <div>
                  <dt>Источников</dt>
                  <dd>{opportunity.evidence.length}</dd>
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
