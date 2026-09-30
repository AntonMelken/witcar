"use client";

import { useT } from "@/i18n/lite";
import { BigNumber } from "@/components/dashboard/BigNumber";
import { StaleBadge } from "@/components/dashboard/StaleBadge";
import { Tile } from "@/components/dashboard/Tile";
import { Change, QuoteRow } from "@/widgets/shared/Quote";
import { SourceCredit } from "@/widgets/shared/SourceCredit";
import { formatPrice } from "@/lib/client/format";
import { dataKey, type WidgetProps } from "../types";
import { cryptoMeta, type CryptoConfig, type CryptoQuote } from "./definition";

const pretty = (id: string) => id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, " ");

export default function CryptoWidget({ config, mode, data }: WidgetProps<CryptoConfig>) {
  const t = useT("widgets.crypto");
  const coins = mode === "drive" ? config.coins.slice(0, 1) : config.coins;
  const entries = coins.map((id) => ({ id, entry: data[dataKey({ kind: "crypto", params: { id, vs: config.vs } })] }));
  const newest = entries.map((e) => e.entry?.result).filter(Boolean)[0];
  const footer = (
    <span className="flex items-center gap-2 justify-between">
      {newest?.source === "coinmarketcap" ? (
        <SourceCredit label="Daten: CoinMarketCap" href="https://coinmarketcap.com/" mode={mode} />
      ) : newest?.source === "coingecko" ? (
        <SourceCredit label="Powered by CoinGecko" href="https://www.coingecko.com/" mode={mode} />
      ) : (
        <span className="truncate">{newest?.source === "mock" ? t("demoData") : ""}</span>
      )}
      {newest ? (
        <StaleBadge
          fetchedAt={newest.fetchedAt}
          refreshMs={cryptoMeta.staleAfterMs!}
          serverStale={newest.stale}
          error={entries[0]?.entry?.error}
        />
      ) : null}
    </span>
  );

  if (coins.length === 1) {
    const q = entries[0]!.entry?.result?.data as CryptoQuote | undefined;
    return (
      <Tile label={pretty(coins[0]!)} footer={footer}>
        {q ? (
          <>
            <BigNumber mode={mode}>{formatPrice(q.price, q.currency)}</BigNumber>
            {q.change24hPct != null ? <Change pct={q.change24hPct} mode={mode} /> : null}
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
        {entries.map(({ id, entry }) => {
          const q = entry?.result?.data as CryptoQuote | undefined;
          return (
            <QuoteRow
              key={id}
              name={pretty(id)}
              price={q ? formatPrice(q.price, q.currency) : "—"}
              pct={q?.change24hPct ?? null}
              rows={coins.length}
            />
          );
        })}
      </ul>
    </Tile>
  );
}
