import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { PageHeader } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MiniSpark } from "@/components/MiniSpark";
import { StockSheet } from "@/components/StockSheet";
import { ScoreBar } from "@/components/ScoreBar";
import {
  Snapshot,
  Stock,
  WatchlistItem,
  fmtPrice,
  fmtPct,
  changeTone,
  ratingLabel,
  fmtMarketStatus,
} from "@/lib/stocks";
import { TrendingUp, TrendingDown, Star, ArrowRight, Gauge } from "lucide-react";

function KpiCard({ title, value, sub, icon }: { title: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</span>
          {icon}
        </div>
        <div className="mt-2 text-xl font-semibold tabular-nums" data-testid={`kpi-${title}`}>{value}</div>
        {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function PickRow({ stock, onClick }: { stock: Stock; onClick: () => void }) {
  const up = stock.changePct >= 0;
  return (
    <button
      onClick={onClick}
      data-testid={`row-pick-${stock.symbol}`}
      className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover-elevate"
    >
      <div className="flex h-8 w-10 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
        #{stock.rank}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{stock.symbol}</span>
          <span className="truncate text-xs text-muted-foreground">{stock.name}</span>
        </div>
        <div className="mt-1 max-w-[180px]">
          <ScoreBar value={stock.compositeScore} />
        </div>
      </div>
      <MiniSpark data={stock.sparkline} up={up} />
      <div className="w-20 text-right">
        <div className="text-sm font-medium tabular-nums">{fmtPrice(stock.price)}</div>
        <div className={`text-xs tabular-nums ${changeTone(stock.changePct)}`}>{fmtPct(stock.changePct, true)}</div>
      </div>
    </button>
  );
}

export default function Dashboard() {
  const [selected, setSelected] = useState<Stock | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: snap, isLoading } = useQuery<Snapshot>({ queryKey: ["/api/snapshot"] });
  const { data: watchlist } = useQuery<WatchlistItem[]>({ queryKey: ["/api/watchlist"] });

  const stocks = snap?.stocks || [];
  const wlSymbols = new Set((watchlist || []).map((w) => w.symbol));

  const topPicks = [...stocks].sort((a, b) => b.compositeScore - a.compositeScore).slice(0, 8);
  const gainers = [...stocks].sort((a, b) => b.changePct - a.changePct).slice(0, 5);
  const losers = [...stocks].sort((a, b) => a.changePct - b.changePct).slice(0, 5);
  const avgComposite =
    stocks.length > 0 ? stocks.reduce((s, x) => s + x.compositeScore, 0) / stocks.length : 0;
  const positives = stocks.filter((s) => s.changePct > 0).length;

  const open = (s: Stock) => {
    setSelected(s);
    setSheetOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={
          snap?.asOf
            ? `Market ${fmtMarketStatus(snap.marketStatus)} · data as of ${snap.asOf}`
            : "Loading market data"
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Universe"
            value={`${snap?.universeSize || stocks.length}`}
            sub="stocks scored"
            icon={<Gauge className="h-4 w-4 text-muted-foreground" />}
          />
          <KpiCard
            title="Top Pick"
            value={topPicks[0]?.symbol || "—"}
            sub={topPicks[0] ? `Composite ${topPicks[0].compositeScore.toFixed(0)}/100` : ""}
            icon={<Star className="h-4 w-4 text-amber-500" />}
          />
          <KpiCard
            title="Breadth"
            value={`${positives}/${stocks.length}`}
            sub="advancing today"
            icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
          />
          <KpiCard
            title="Avg Score"
            value={avgComposite.toFixed(1)}
            sub="composite, 0–100"
            icon={<Gauge className="h-4 w-4 text-muted-foreground" />}
          />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Top Picks</CardTitle>
            <Link href="/screener">
              <Button variant="ghost" size="sm" className="gap-1 text-xs" data-testid="link-view-screener">
                Full screener <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-0.5">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-md" />)
              : topPicks.map((s) => <PickRow key={s.symbol} stock={s} onClick={() => open(s)} />)}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-emerald-500" /> Top Gainers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {gainers.map((s) => (
                <button
                  key={s.symbol}
                  onClick={() => open(s)}
                  data-testid={`row-gainer-${s.symbol}`}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover-elevate"
                >
                  <span className="font-medium">{s.symbol}</span>
                  <span className={`tabular-nums ${changeTone(s.changePct)}`}>{fmtPct(s.changePct, true)}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="h-4 w-4 text-rose-500" /> Top Losers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {losers.map((s) => (
                <button
                  key={s.symbol}
                  onClick={() => open(s)}
                  data-testid={`row-loser-${s.symbol}`}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover-elevate"
                >
                  <span className="font-medium">{s.symbol}</span>
                  <span className={`tabular-nums ${changeTone(s.changePct)}`}>{fmtPct(s.changePct, true)}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {watchlist && watchlist.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4 text-amber-500" /> Your Watchlist
            </CardTitle>
            <Link href="/watchlist">
              <Button variant="ghost" size="sm" className="gap-1 text-xs" data-testid="link-view-watchlist">
                Manage <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {watchlist.map((w) =>
                w.data ? (
                  <button
                    key={w.symbol}
                    onClick={() => open(w.data!)}
                    data-testid={`card-watch-${w.symbol}`}
                    className="flex items-center justify-between rounded-lg border border-border p-3 text-left hover-elevate"
                  >
                    <div>
                      <div className="font-semibold">{w.symbol}</div>
                      <Badge variant="secondary" className="mt-1 font-normal text-[10px]">
                        {ratingLabel(w.data.consensusRating)}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium tabular-nums">{fmtPrice(w.data.price)}</div>
                      <div className={`text-xs tabular-nums ${changeTone(w.data.changePct)}`}>
                        {fmtPct(w.data.changePct, true)}
                      </div>
                    </div>
                  </button>
                ) : (
                  <div key={w.symbol} className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
                    {w.symbol} <span className="text-xs">(not in universe)</span>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        Educational tool — scores rank stocks by value, momentum, and analyst signals. Not investment advice.
      </p>

      <StockSheet
        stock={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        inWatchlist={selected ? wlSymbols.has(selected.symbol) : false}
      />
    </div>
  );
}
