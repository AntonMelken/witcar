"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="de">
      <body style={{ background: "#0f1114", color: "#f2f4f6", fontFamily: "system-ui, sans-serif" }}>
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
