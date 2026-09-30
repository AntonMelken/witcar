"use client";

import { Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Section, Segmented, Toggle } from "@/components/apps/ui";
import { useT } from "@/i18n/lite";
import { formatNumber, formatPrice, formatSignedPercent } from "@/lib/client/format";
import { readJson, writeJson } from "@/lib/client/storage";
import { useDashboardData } from "@/lib/client/useDashboardData";
import { SourceCredit } from "../shared/SourceCredit";
import { dataKey, type AppProps, type DataEntry } from "../types";
import { parseAmount, periodStats, positionValue } from "./chartMath";
import {
  STOCK_MAX_SYMBOLS,
  STOCK_RANGES,
  STOCK_SYMBOL_PATTERN,
  type StockHistory,
  type StockMatch,
  type StockQuote,
  type StockRange,
  type StocksConfig,
} from "./definition";
import { PriceChart } from "./PriceChart";

const SYMBOL_RE = new RegExp(STOCK_SYMBOL_PATTERN);
const CREDITS: Record<string, { label: string; href: string }> = {
  twelvedata: { label: "Kursdaten: Twelve Data", href: "https://twelvedata.com/" },
  finnhub: { label: "Kursdaten: Finnhub", href: "https://finnhub.io/" },
};
const quoteKey = (symbol: string) => dataKey({ kind: "stock", params: { symbol } });

function Change({ pct, abs, currency }: { pct: number | null; abs?: number | null; currency?: string | null }) {
  if (pct == null) return null;
  const cls = pct > 0 ? "text-positive" : pct < 0 ? "text-negative" : "text-dim";
  return (
    <span className={`tabular font-semibold ${cls}`}>
      <span aria-hidden="true">{pct > 0 ? "▲ " : pct < 0 ? "▼ " : "■ "}</span>
      {abs != null ? `${abs > 0 ? "+" : abs < 0 ? "−" : ""}${formatPrice(Math.abs(abs), currency ?? null)} · ` : ""}
      {formatSignedPercent(pct)}
    </span>
  );
}

export default function StocksApp({ config, data, setConfig, registerRefresh }: AppProps<StocksConfig>) {
  const t = useT("widgets.stocks");
  const [selected, setSelected] = useState(config.symbols[0] ?? null);
  const [range, setRange] = useState<StockRange>("1M");
  const [average, setAverage] = useState(false);
  const symbol = selected && config.symbols.includes(selected) ? selected : (config.symbols[0] ?? null);

  const requests = useMemo(
    () => (symbol ? [{ kind: "history" as const, params: { symbol, range } }] : []),
    [symbol, range],
  );
  const history = useDashboardData(requests, { refreshMs: 5 * 60_000 });
  const { refresh: refreshHistory } = history;
  useEffect(() => {
    registerRefresh(refreshHistory);
    return () => registerRefresh(null);
  }, [registerRefresh, refreshHistory]);

  const quote = symbol ? data[quoteKey(symbol)] : undefined;
  const q = quote?.result?.data as StockQuote | undefined;
  const histEntry: DataEntry | undefined = symbol
    ? history.entries[dataKey({ kind: "history", params: { symbol, range } })]
    : undefined;
  const hist = histEntry?.result?.data as StockHistory | undefined;
  const stats = hist ? periodStats(hist.points) : null;
  const source = quote?.result?.source ?? histEntry?.result?.source ?? null;
  const credit = source ? CREDITS[source] : undefined;

  const add = (sym: string) => {
    if (config.symbols.includes(sym) || config.symbols.length >= STOCK_MAX_SYMBOLS) {
      setSelected(sym);
      return;
    }
    setConfig({ ...config, symbols: [...config.symbols, sym] });
    setSelected(sym);
  };
  const remove = (sym: string) => {
    if (config.symbols.length <= 1) return;
    setConfig({ ...config, symbols: config.symbols.filter((s) => s !== sym) });
  };

  const historyError =
    histEntry?.error === "unsupported"
      ? t("app.noHistoryProvider")
      : histEntry?.error === "disabled"
        ? t("disabled")
        : histEntry?.error
          ? t("app.historyUnavailable")
          : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="space-y-4">
        <SearchBox onAdd={add} existing={config.symbols} full={config.symbols.length >= STOCK_MAX_SYMBOLS} />
        <Section title={t("app.watchlist")} hint={t("app.watchlistHint", { max: STOCK_MAX_SYMBOLS })}>
          <ul className="space-y-2" data-testid="watchlist">
            {config.symbols.map((sym) => {
              const e = data[quoteKey(sym)];
              const row = e?.result?.data as StockQuote | undefined;
              const active = sym === symbol;
              return (
                <li
                  key={sym}
                  className={`flex items-center rounded-xl border ${active ? "border-accent bg-surface-2" : "border-border"}`}
                >
                  <button
                    type="button"
                    className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3 text-left"
                    aria-pressed={active}
                    onClick={() => setSelected(sym)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{sym}</span>
                      {row?.name ? <span className="block truncate text-xs text-dim">{row.name}</span> : null}
                    </span>
                    <span className="text-right tabular">
                      <span className="block">{row ? formatPrice(row.price, row.currency) : e?.error ? "—" : "…"}</span>
                      {row ? <Change pct={row.changePct} /> : null}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost border-transparent"
                    aria-label={t("app.remove", { symbol: sym })}
                    disabled={config.symbols.length <= 1}
                    onClick={() => remove(sym)}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
          <Toggle
            checked={config.showChange}
            onChange={(v) => setConfig({ ...config, showChange: v })}
            label={t("fields.showChange")}
          />
        </Section>
      </div>

      <div className="space-y-4">
        {symbol ? (
          <Section title={symbol} hint={q?.name ?? undefined}>
            {q ? (
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="tabular text-5xl font-semibold" data-testid="app-stock-price">
                  {formatPrice(q.price, q.currency)}
                </span>
                <Change pct={q.changePct} abs={q.change} currency={q.currency} />
              </div>
            ) : (
              <p className="text-dim">{quote?.error ? t("unavailable") : t("loading")}</p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Segmented
                label={t("app.range")}
                value={range}
                onChange={setRange}
                options={STOCK_RANGES.map((r) => ({ value: r, label: t(`app.ranges.${r}`) }))}
              />
              <Toggle checked={average} onChange={setAverage} label={t("app.average")} />
            </div>

            {hist && hist.points.length > 1 ? (
              <PriceChart
                history={hist}
                showAverage={average}
                averageLabel={t("app.averageShort")}
                label={t("app.chartLabel", { symbol: symbol, range: t(`app.ranges.${range}`) })}
              />
            ) : historyError ? (
              <p className="rounded-xl border border-border p-4 text-dim" role="status">
                {historyError}
              </p>
            ) : (
              <p className="text-dim">{t("loading")}</p>
            )}

            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3" data-testid="stock-stats">
              <Stat label={t("app.open")} value={q?.open} currency={q?.currency} />
              <Stat label={t("app.dayHigh")} value={q?.high} currency={q?.currency} />
              <Stat label={t("app.dayLow")} value={q?.low} currency={q?.currency} />
              <Stat label={t("app.prevClose")} value={q?.prevClose} currency={q?.currency} />
              <Stat label={t("app.week52High")} value={q?.week52High} currency={q?.currency} />
              <Stat label={t("app.week52Low")} value={q?.week52Low} currency={q?.currency} />
              {stats ? (
                <>
                  <Stat label={t("app.periodHigh")} value={stats.high} currency={hist?.currency ?? q?.currency} />
                  <Stat label={t("app.periodLow")} value={stats.low} currency={hist?.currency ?? q?.currency} />
                  <div>
                    <dt className="text-dim">{t("app.periodChange")}</dt>
                    <dd>
                      <Change pct={stats.changePct} />
                    </dd>
                  </div>
                </>
              ) : null}
            </dl>
          </Section>
        ) : null}

        {symbol && q ? <PositionCalc key={symbol} symbol={symbol} price={q.price} currency={q.currency} /> : null}

        <p className="flex flex-wrap items-center gap-x-2 text-xs text-dim">
          <span>{source === "mock" ? t("demoData") : t("disclaimer")}</span>
          {credit ? <SourceCredit label={credit.label} href={credit.href} mode="standard" /> : null}
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  currency,
}: {
  label: string;
  value: number | null | undefined;
  currency?: string | null;
}) {
  if (value == null) return null;
  return (
    <div>
      <dt className="text-dim">{label}</dt>
      <dd className="tabular font-medium">{formatPrice(value, currency ?? null)}</dd>
    </div>
  );
}

function SearchBox({ onAdd, existing, full }: { onAdd: (symbol: string) => void; existing: string[]; full: boolean }) {
  const t = useT("widgets.stocks");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<StockMatch[] | null>(null);
  const typed = q.trim().toUpperCase();
  const direct = SYMBOL_RE.test(typed) && !existing.includes(typed) ? typed : null;

  const search = async () => {
    if (!q.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) {
        const code = ((await res.json().catch(() => null)) as { error?: { code?: string } } | null)?.error?.code;
        throw new Error(code ?? String(res.status));
      }
      setResults(((await res.json()) as { results: StockMatch[] }).results);
    } catch (err) {
      setResults(null);
      setError((err as Error).message === "disabled" ? t("disabled") : t("app.searchError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title={t("app.add")}>
      <div className="flex gap-2">
        <input
          className="input"
          type="search"
          value={q}
          placeholder={t("app.searchPlaceholder")}
          aria-label={t("app.searchPlaceholder")}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void search();
            }
          }}
        />
        <button
          type="button"
          className="btn"
          onClick={() => void search()}
          disabled={busy}
          aria-label={t("app.search")}
        >
          <Search size={18} aria-hidden="true" />
        </button>
      </div>
      {full ? <p className="text-sm text-warning">{t("app.full", { max: STOCK_MAX_SYMBOLS })}</p> : null}
      {error ? (
        <p className="text-sm text-negative" role="alert">
          {error}
        </p>
      ) : null}
      {direct && !full ? (
        <button type="button" className="btn w-full justify-start" onClick={() => onAdd(direct)}>
          <Plus size={18} aria-hidden="true" />
          {t("app.addSymbol", { symbol: direct })}
        </button>
      ) : null}
      {results && results.length === 0 ? <p className="text-sm text-dim">{t("app.noResults")}</p> : null}
      {results && results.length > 0 ? (
        <ul className="space-y-1" data-testid="stock-results">
          {results.map((r) => {
            const added = existing.includes(r.symbol);
            return (
              <li key={`${r.symbol}|${r.exchange}`}>
                <button
                  type="button"
                  className="btn btn-ghost w-full justify-start text-left font-normal"
                  disabled={full && !added}
                  onClick={() => onAdd(r.symbol)}
                >
                  <span className="font-semibold">{r.symbol}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-dim">
                    {r.name}
                    {r.exchange ? ` · ${r.exchange}` : ""}
                  </span>
                  {added ? (
                    <span className="text-xs text-dim">{t("app.added")}</span>
                  ) : (
                    <Plus size={16} aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </Section>
  );
}

/** Value of a position and gain/loss against the buy price. Inputs stay on this device. */
function PositionCalc({ symbol, price, currency }: { symbol: string; price: number; currency: string | null }) {
  const t = useT("widgets.stocks");
  const storeKey = `wc:stocks:pos:${symbol}`;
  const [qty, setQty] = useState(() => readJson<{ qty: string; buy: string }>(storeKey)?.qty ?? "");
  const [buy, setBuy] = useState(() => readJson<{ qty: string; buy: string }>(storeKey)?.buy ?? "");
  const quantity = parseAmount(qty);
  const buyPrice = parseAmount(buy);
  const pos = quantity != null ? positionValue(quantity, price, buyPrice) : null;
  const save = (nextQty: string, nextBuy: string) => writeJson(storeKey, { qty: nextQty, buy: nextBuy });
  const money = (v: number) => formatPrice(v, currency);
  return (
    <Section title={t("app.calc")} hint={t("app.calcHint")}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t("app.quantity")}</span>
          <input
            className="input"
            inputMode="decimal"
            value={qty}
            placeholder="10"
            onChange={(e) => {
              setQty(e.target.value);
              save(e.target.value, buy);
            }}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t("app.buyPrice")}</span>
          <input
            className="input"
            inputMode="decimal"
            value={buy}
            placeholder={formatNumber(price, "de-DE", { min: 2, max: 2 })}
            onChange={(e) => {
              setBuy(e.target.value);
              save(qty, e.target.value);
            }}
          />
        </label>
      </div>
      {pos ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1" data-testid="calc-result">
          <dt className="text-dim">{t("app.value")}</dt>
          <dd className="tabular font-semibold">{money(pos.value)}</dd>
          {pos.cost != null ? (
            <>
              <dt className="text-dim">{t("app.cost")}</dt>
              <dd className="tabular">{money(pos.cost)}</dd>
              <dt className="text-dim">{t("app.gain")}</dt>
              <dd>
                <Change pct={pos.gainPct} abs={pos.gain} currency={currency} />
              </dd>
            </>
          ) : null}
        </dl>
      ) : null}
    </Section>
  );
}
