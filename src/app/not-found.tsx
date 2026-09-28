import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-bold">Seite nicht gefunden</h1>
      <Link href="/" className="btn btn-primary">
        Zur Startseite
      </Link>
    </main>
  );
}
