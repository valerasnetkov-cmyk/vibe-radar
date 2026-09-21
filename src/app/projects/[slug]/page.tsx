export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
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
        <p className="eyebrow">Проект / {slug}</p>
        <h1>Запись ещё не опубликована.</h1>
        <p className="lede">
          Проектные страницы показывают только нормализованные данные и подтверждённые источники.
          Пока для этого проекта нет публичной записи.
        </p>
      </section>
      <footer className="footer">
        <a href="/radar">К радару</a>
      </footer>
    </main>
  );
}
