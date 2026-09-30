"use client";

import { useT } from "@/i18n/lite";
import { BigNumber } from "@/components/dashboard/BigNumber";
import { StaleBadge } from "@/components/dashboard/StaleBadge";
import { Tile } from "@/components/dashboard/Tile";
import { Change, QuoteRow } from "@/widgets/shared/Quote";
import { formatPrice } from "@/lib/client/format";
import { dataKey, type WidgetProps } from "../types";
import { stocksMeta, type StockQuote, type StocksConfig } from "./definition";

export default function StocksWidget({ config, mode, data }: WidgetProps<StocksConfig>) {
  const t = useT("widgets.stocks");
  const symbols = mode === "drive" ? config.symbols.slice(0, 1) : config.symbols;
  const entries = symbols.map((symbol) => ({ symbol, entry: data[dataKey({ kind: "stock", params: { symbol } })] }));
  const newest = entries.map((e) => e.entry?.result).filter(Boolean)[0];
  const isMock = newest?.source === "mock";
  // STOCKS_PROVIDER=off: no licensed quote source configured (D-008)
  if (entries.some((e) => e.entry?.error === "disabled")) {
    return (
      <Tile label={t("title")}>
        <p className="text-dim">{t("disabled")}</p>
      </Tile>
    );
  }
  const footer = (
    <span className="flex items-center gap-2 justify-between">
      <span className="truncate">{isMock ? t("demoData") : t("disclaimer")}</span>
      {newest ? (
        <StaleBadge
          fetchedAt={newest.fetchedAt}
          refreshMs={stocksMeta.refreshMs!}
          serverStale={newest.stale}
          error={entries[0]?.entry?.error}
        />
      ) : null}
    </span>
  );

  if (symbols.length === 1) {
    const q = entries[0]!.entry?.result?.data as StockQuote | undefined;
    return (
      <Tile label={symbols[0]} footer={mode === "drive" ? undefined : footer}>
        {q ? (
          <>
            <BigNumber mode={mode}>{formatPrice(q.price, q.currency)}</BigNumber>
            {config.showChange && q.changePct != null ? <Change pct={q.changePct} mode={mode} /> : null}
          </>
        ) : (
          <p className="text-dim">{entries[0]!.entry?.error ? t("unavailable") : t("loading")}</p>
        )}
      </Tile>
    );
  }

  return (
    <Tile label={t("title")} footer={footer}>
      <ul className="flex flex-col justify-center gap-[2cqh] min-h-0 overflow-hidden">
        {entries.map(({ symbol, entry }) => {
          const q = entry?.result?.data as StockQuote | undefined;
          return (
            <QuoteRow
              key={symbol}
              name={symbol}
              price={q ? formatPrice(q.price, q.currency) : "—"}
              pct={config.showChange ? (q?.changePct ?? null) : null}
              rows={symbols.length}
            />
          );
        })}
      </ul>
    </Tile>
  );
}
