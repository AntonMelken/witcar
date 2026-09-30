export default function NotFound() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-bold">Seite nicht gefunden</h1>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- plain link on purpose: next/link would add its client code to every page (§17) */}
      <a href="/" className="btn btn-primary">
        Zur Startseite
      </a>
    </main>
  );
}
