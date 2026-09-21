import { listPublicMechanics } from "@/server/modules/mechanics/read-repository";

export const dynamic = "force-dynamic";

export default async function MechanicsPage() {
  const mechanics = await listPublicMechanics();
  return (
    <main className="shell">
      <header className="header">
        <a className="wordmark" href="/">
          VibeRadar
        </a>
        <nav>
          <a href="/radar">Радар</a> · <a href="/mechanics">Механики</a> ·{" "}
          <a href="/methodology">Методология</a>
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
        {mechanics.length === 0 ? (
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
