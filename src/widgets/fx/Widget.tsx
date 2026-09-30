"use client";

import { useT } from "@/i18n/lite";
import { BigNumber } from "@/components/dashboard/BigNumber";
import { StaleBadge } from "@/components/dashboard/StaleBadge";
import { Tile } from "@/components/dashboard/Tile";
import { Change, QuoteRow } from "@/widgets/shared/Quote";
import { SourceCredit } from "@/widgets/shared/SourceCredit";
import { formatNumber } from "@/lib/client/format";
import { dataKey, type WidgetProps } from "../types";
import { fxMeta, type FxConfig, type FxData } from "./definition";

const ECB_URL =
  "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html";

const fmtRate = (v: number) => formatNumber(v, "de-DE", v >= 100 ? { min: 2, max: 2 } : { min: 4, max: 4 });

export default function FxWidget({ config, mode, data }: WidgetProps<FxConfig>) {
  const t = useT("widgets.fx");
  const currencies = mode === "drive" ? config.currencies.slice(0, 1) : config.currencies;
  const entry = data[dataKey({ kind: "fx", params: {} })];
  const fx = entry?.result?.data as FxData | undefined;
  const change = (c: string): number | null => {
    const now = fx?.rates[c];
    const before = fx?.prev?.[c];
    return config.showChange && now && before ? (now / before - 1) * 100 : null;
  };

  const footer = entry?.result ? (
    <span className="flex items-center gap-2 justify-between">
      {entry.result.source === "ecb" && fx ? (
        <SourceCredit
          label={t("credit", { date: `${fx.date.slice(8, 10)}.${fx.date.slice(5, 7)}.` })}
          href={ECB_URL}
          mode={mode}
        />
      ) : (
        <span className="truncate">{entry.result.source === "mock" ? t("demoData") : ""}</span>
      )}
      <StaleBadge
        fetchedAt={entry.result.fetchedAt}
        refreshMs={fxMeta.staleAfterMs!}
        serverStale={entry.result.stale}
        error={entry.error}
      />
    </span>
  ) : null;
  const empty = <p className="text-dim">{entry?.error ? t("unavailable") : t("loading")}</p>;

  if (currencies.length === 1) {
    const c = currencies[0]!;
    const rate = fx?.rates[c];
    const pct = change(c);
    return (
      <Tile label={`EUR/${c}`} footer={footer}>
        {fx ? (
          <>
            <BigNumber mode={mode}>{rate ? fmtRate(rate) : "—"}</BigNumber>
            {pct != null ? <Change pct={pct} mode={mode} /> : null}
          </>
        ) : (
          empty
        )}
      </Tile>
    );
  }

  return (
    <Tile label={t("title")} footer={footer}>
      {fx ? (
        <ul className="flex flex-col justify-center gap-[2cqh] min-h-0 overflow-hidden">
          {currencies.map((c) => {
            const rate = fx.rates[c];
            return (
              <QuoteRow
                key={c}
                name={`EUR/${c}`}
                price={rate ? fmtRate(rate) : "—"}
                pct={change(c)}
                rows={currencies.length}
              />
            );
          })}
        </ul>
      ) : (
        empty
      )}
    </Tile>
  );
}
