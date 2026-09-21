export default function HomePage() {
  return (
    <main className="shell">
      <header className="header">
        <a className="wordmark" href="/">
          VibeRadar
        </a>
        <span className="stage">FOUNDATION / 01</span>
      </header>
      <section className="intro">
        <p className="eyebrow">Технологическая разведка для builders</p>
        <h1>Что растёт. Почему это важно. Что можно построить.</h1>
        <p className="lede">
          VibeRadar собирает основу для будущего радара проектов и сигналов. Публичные данные
          появятся после запуска проверяемого pipeline.
        </p>
      </section>
      <section className="status" aria-labelledby="status-title">
        <div>
          <p className="eyebrow">Состояние системы</p>
          <h2 id="status-title">Фундамент готовится</h2>
        </div>
        <p className="muted">
          Реальные метрики появятся после подключения сбора данных и исторических снимков.
        </p>
      </section>
      <footer className="footer">
        <span>VibeRadar / v0.1</span>
        <a href="/api/health/live">Проверить состояние</a>
      </footer>
    </main>
  );
}
