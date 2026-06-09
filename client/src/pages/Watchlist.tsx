import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { PageHeader } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MiniSpark } from "@/components/MiniSpark";
import { StockSheet } from "@/components/StockSheet";
import { ScoreBar } from "@/components/ScoreBar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Snapshot,
  Stock,
  WatchlistItem,
  fmtPrice,
  fmtPct,
  changeTone,
  ratingLabel,
} from "@/lib/stocks";
import { Star, Trash2, Plus, ArrowRight } from "lucide-react";

export default function Watchlist() {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Stock | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addSymbol, setAddSymbol] = useState("");

  const { data: snap } = useQuery<Snapshot>({ queryKey: ["/api/snapshot"] });
  const { data: watchlist, isLoading } = useQuery<WatchlistItem[]>({ queryKey: ["/api/watchlist"] });

  const universe = snap?.stocks || [];
  const wlSymbols = new Set((watchlist || []).map((w) => w.symbol));
  const available = universe.filter((s) => !wlSymbols.has(s.symbol));

  const addMut = useMutation({
    mutationFn: async (symbol: string) => apiRequest("POST", "/api/watchlist", { symbol }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      setAddSymbol("");
      toast({ title: "Added to watchlist" });
    },
    onError: () => toast({ title: "Could not add", variant: "destructive" }),
  });

  const removeMut = useMutation({
    mutationFn: async (symbol: string) => apiRequest("DELETE", `/api/watchlist/${symbol}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({ title: "Removed from watchlist" });
    },
  });

  const open = (s: Stock) => {
    setSelected(s);
    setSheetOpen(true);
  };

  const items = watchlist || [];

  return (
    <div>
      <PageHeader
        title="Watchlist"
        subtitle="Track the stocks you care about with live scores"
      />

      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-end gap-3 pt-5">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Add from universe
            </label>
            <Select value={addSymbol} onValueChange={setAddSymbol}>
              <SelectTrigger data-testid="select-add-symbol">
                <SelectValue placeholder="Choose a stock…" />
              </SelectTrigger>
              <SelectContent>
                {available.length === 0 ? (
                  <SelectItem value="none" disabled>
                    All stocks added
                  </SelectItem>
                ) : (
                  available.map((s) => (
                    <SelectItem key={s.symbol} value={s.symbol}>
                      {s.symbol} — {s.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => addSymbol && addSymbol !== "none" && addMut.mutate(addSymbol)}
            disabled={!addSymbol || addSymbol === "none" || addMut.isPending}
            className="gap-2"
            data-testid="button-add"
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Star className="h-10 w-10 text-muted-foreground/40" />
            <div>
              <p className="font-medium">Your watchlist is empty</p>
              <p className="text-sm text-muted-foreground">
                Add stocks above, or browse the screener to find opportunities.
              </p>
            </div>
            <Link href="/screener">
              <Button variant="outline" size="sm" className="gap-1" data-testid="link-go-screener">
                Open screener <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((w) => (
            <Card key={w.symbol} className="overflow-hidden">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <button
                    onClick={() => w.data && open(w.data)}
                    data-testid={`button-open-${w.symbol}`}
                    className="text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{w.symbol}</span>
                      {w.data && (
                        <Badge variant="secondary" className="font-normal text-[10px]">
                          #{w.data.rank}
                        </Badge>
                      )}
                    </div>
                    {w.data && (
                      <div className="max-w-[150px] truncate text-xs text-muted-foreground">{w.data.name}</div>
                    )}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground"
                    onClick={() => removeMut.mutate(w.symbol)}
                    data-testid={`button-remove-${w.symbol}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {w.data ? (
                  <>
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold tabular-nums">{fmtPrice(w.data.price)}</div>
                        <div className={`text-xs tabular-nums ${changeTone(w.data.changePct)}`}>
                          {fmtPct(w.data.changePct, true)} today
                        </div>
                      </div>
                      <MiniSpark data={w.data.sparkline} up={w.data.changePct >= 0} />
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <ScoreBar value={w.data.compositeScore} label="Composite" />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{ratingLabel(w.data.consensusRating)}</span>
                      <span className={`tabular-nums ${changeTone(w.data.upsidePct)}`}>
                        {fmtPct(w.data.upsidePct, true)} upside
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">Not in current universe.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <StockSheet
        stock={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        inWatchlist={true}
      />
    </div>
  );
}
