import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScoreBar, RangeBar } from "@/components/ScoreBar";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Star, Trash2 } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip as RTooltip } from "recharts";
import {
  Stock,
  fmtPrice,
  fmtMarketCap,
  fmtPct,
  fmtNum,
  ratingLabel,
  changeTone,
} from "@/lib/stocks";

function Spark({ data, up }: { data: number[]; up: boolean }) {
  const series = data.map((v, i) => ({ i, v }));
  const stroke = up ? "hsl(152 60% 45%)" : "hsl(350 75% 55%)";
  return (
    <div className="h-40 w-full" data-testid="chart-sparkline">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <RTooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={() => ""}
            formatter={(v: number) => [`$${v.toFixed(2)}`, "Close"]}
          />
          <Line type="monotone" dataKey="v" stroke={stroke} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-sm font-medium tabular-nums ${tone || ""}`}>{value}</div>
    </div>
  );
}

export function StockSheet({
  stock,
  open,
  onOpenChange,
  inWatchlist,
}: {
  stock: Stock | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  inWatchlist?: boolean;
}) {
  const { toast } = useToast();

  const addMut = useMutation({
    mutationFn: async (symbol: string) =>
      apiRequest("POST", "/api/watchlist", { symbol }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({ title: "Added to watchlist", description: stock?.symbol });
    },
  });

  const removeMut = useMutation({
    mutationFn: async (symbol: string) =>
      apiRequest("DELETE", `/api/watchlist/${symbol}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({ title: "Removed from watchlist", description: stock?.symbol });
    },
  });

  if (!stock) return null;
  const spark = stock.sparkline || [];
  const sparkUp = spark.length >= 2 ? spark[spark.length - 1] >= spark[0] : stock.changePct >= 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="font-bold">{stock.symbol}</span>
              <Badge variant="secondary" className="font-normal">
                #{stock.rank}
              </Badge>
            </span>
            <span className="text-lg tabular-nums" data-testid={`text-price-${stock.symbol}`}>
              {fmtPrice(stock.price)}
            </span>
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            {stock.name} · {stock.sector}
          </p>
        </SheetHeader>

        <div className="mt-2 flex items-center gap-3">
          <span className={`text-sm font-medium tabular-nums ${changeTone(stock.changePct)}`}>
            {fmtPct(stock.changePct, true)} today
          </span>
        </div>

        {spark.length > 1 && (
          <div className="mt-4">
            <div className="mb-1 text-xs text-muted-foreground">6-month price trend</div>
            <Spark data={spark} up={sparkUp} />
          </div>
        )}

        <Separator className="my-4" />

        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Score breakdown
          </div>
          <ScoreBar value={stock.compositeScore} label="Composite" />
          <ScoreBar value={stock.valueScore} label="Value" />
          <ScoreBar value={stock.momentumScore} label="Momentum" />
          <ScoreBar value={stock.analystScore} label="Analyst" />
        </div>

        <Separator className="my-4" />

        <div className="mb-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            52-week range
          </div>
          <RangeBar low={stock.yearLow} high={stock.yearHigh} current={stock.price} />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Stat label="Market cap" value={fmtMarketCap(stock.marketCap)} />
          <Stat label="P/E ratio" value={stock.pe != null ? stock.pe.toFixed(1) : "—"} />
          <Stat label="EPS" value={stock.eps != null ? fmtPrice(stock.eps) : "—"} />
          <Stat
            label="Dividend yield"
            value={stock.dividendYield ? fmtPct(stock.dividendYield) : "—"}
          />
          <Stat label="Volume" value={fmtNum(stock.volume)} />
          <Stat label="Avg volume" value={fmtNum(stock.avgVolume)} />
        </div>

        <Separator className="my-4" />

        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Wall Street view
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Stat label="Consensus" value={ratingLabel(stock.consensusRating)} />
          <Stat label="# Analysts" value={stock.totalRatings != null ? String(stock.totalRatings) : "—"} />
          <Stat label="Avg target" value={fmtPrice(stock.avgTarget)} />
          <Stat
            label="Upside"
            value={fmtPct(stock.upsidePct, true)}
            tone={changeTone(stock.upsidePct)}
          />
          <Stat label="High target" value={fmtPrice(stock.highTarget)} />
          <Stat label="Low target" value={fmtPrice(stock.lowTarget)} />
        </div>

        <Separator className="my-4" />

        {inWatchlist ? (
          <Button
            variant="outline"
            className="w-full gap-2"
            disabled={removeMut.isPending}
            onClick={() => removeMut.mutate(stock.symbol)}
            data-testid="button-remove-watchlist"
          >
            <Trash2 className="h-4 w-4" /> Remove from watchlist
          </Button>
        ) : (
          <Button
            className="w-full gap-2"
            disabled={addMut.isPending}
            onClick={() => addMut.mutate(stock.symbol)}
            data-testid="button-add-watchlist"
          >
            <Star className="h-4 w-4" /> Add to watchlist
          </Button>
        )}
      </SheetContent>
    </Sheet>
  );
}
