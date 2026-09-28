"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * Upgrade with explicit consent to immediate service start (loss of the
 * withdrawal right for digital services, §15.2). The consent is stored
 * server-side with a timestamp before redirecting to Stripe Checkout.
 */
export function CheckoutButton({ configured, hasYearly }: { configured: boolean; hasYearly: boolean }) {
  const t = useTranslations("billing");
  const [interval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [waive, setWaive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!configured) return <p className="text-dim text-sm">{t("notConfigured")}</p>;

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ interval, waiveWithdrawal: true }),
      });
      const body = (await res.json()) as { url?: string; error?: { code: string } };
      if (!res.ok || !body.url) throw new Error(body.error?.code ?? "failed");
      window.location.assign(body.url);
    } catch (e) {
      setError((e as Error).message === "already_pro" ? t("alreadyPro") : t("failed"));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {hasYearly ? (
        <div className="flex gap-2" role="radiogroup" aria-label={t("interval")}>
          {(["monthly", "yearly"] as const).map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={interval === i}
              className={`btn flex-1 ${interval === i ? "btn-primary" : ""}`}
              onClick={() => setBillingInterval(i)}
            >
              {t(i)}
            </button>
          ))}
        </div>
      ) : null}
      <label className="flex items-start gap-3 text-sm cursor-pointer min-h-12">
        <input
          type="checkbox"
          className="mt-1 size-5 shrink-0"
          checked={waive}
          onChange={(e) => setWaive(e.target.checked)}
        />
        <span className="text-dim">{t("waiver")}</span>
      </label>
      <button
        type="button"
        className="btn btn-primary w-full"
        disabled={!waive || busy}
        onClick={start}
        data-testid="checkout"
      >
        {busy ? t("redirecting") : t("upgrade")}
      </button>
      {error ? <p className="text-negative text-sm">{error}</p> : null}
    </div>
  );
}
