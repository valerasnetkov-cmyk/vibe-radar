import { listPublicOpportunities } from "@/server/modules/opportunities/read-repository";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  const opportunities = await listPublicOpportunities();
  return (
    <main className="shell">
      <header className="header">
        <a className="wordmark" href="/">
          VibeRadar
        </a>
        <nav>
          <a href="/radar">Радар</a> · <a href="/opportunities">Возможности</a> ·{" "}
          <a href="/methodology">Методология</a>
        </nav>
      </header>
      <section className="intro">
        <p className="eyebrow">Opportunity Engine</p>
        <h1>Что можно построить на проверенном сигнале.</h1>
        <p className="lede">
          Opportunity cards отделяют факты источника от продуктовой гипотезы и всегда показывают
          market scope, confidence и differentiation.
        </p>
      </section>
      <section className="records" aria-live="polite">
        {opportunities.length === 0 ? (
          <p className="muted">
            Публичных возможностей пока нет. Сначала требуется evidence-linked proposal и editorial
            approval.
          </p>
        ) : (
          opportunities.map((opportunity) => (
            <article className="record" key={opportunity.id}>
              <div>
                <p className="eyebrow">
                  {opportunity.marketScope} · {opportunity.confidence} confidence
                </p>
                <h2>{opportunity.title}</h2>
                <p className="muted">{opportunity.problemStatement}</p>
                <p>{opportunity.targetUser}</p>
              </div>
              <p className="record-link">{opportunity.differentiation}</p>
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
