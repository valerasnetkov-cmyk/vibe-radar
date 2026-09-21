export default function MethodologyPage() {
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
        <p className="eyebrow">Методология</p>
        <h1>Сигнал важнее шума.</h1>
        <p className="lede">
          VIBE SCORE отделён от reach, velocity, confidence и buildability. Источник и история
          наблюдений важнее уверенного текста.
        </p>
      </section>
      <section className="status">
        <div>
          <p className="eyebrow">Принципы</p>
          <h2>Evidence first</h2>
        </div>
        <p className="muted">
          AI помогает объяснить сигнал, но не может изменить score, одобрить публикацию или
          выполнить действие.
        </p>
      </section>
      <footer className="footer">
        <a href="/">На главную</a>
      </footer>
    </main>
  );
}
