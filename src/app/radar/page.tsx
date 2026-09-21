export default function RadarPage() {
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
        <h1>Данные появятся после первого сбора.</h1>
        <p className="lede">
          Здесь будут только проверенные проекты с историей наблюдений, score, confidence и
          buildability.
        </p>
      </section>
      <footer className="footer">
        <a href="/">На главную</a>
      </footer>
    </main>
  );
}
