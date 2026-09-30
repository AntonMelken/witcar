"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="de">
      <body style={{ background: "#efeff1", color: "#0e0e10", fontFamily: "system-ui, sans-serif" }}>
        <main
          style={{
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <h1>Etwas ist schiefgelaufen.</h1>
          <button type="button" onClick={reset} style={{ minHeight: 48, padding: "0 20px", borderRadius: 14 }}>
            Erneut versuchen
          </button>
        </main>
      </body>
    </html>
  );
}
