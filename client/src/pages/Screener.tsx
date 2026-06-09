import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/Layout";
import { Card } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MiniSpark } from "@/components/MiniSpark";
import { StockSheet } from "@/components/StockSheet";
import {
  Snapshot,
  Stock,
  WatchlistItem,
  fmtPrice,
  fmtPct,
  fmtMarketCap,
  changeTone,
  scoreTone,
} from "@/lib/stocks";
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";

type SortKey =
  | "rank"
  | "symbol"
  | "price"
  | "changePct"
  | "marketCap"
  | "pe"
  | "valueScore"
  | "momentumScore"
  | "analystScore"
  | "upsidePct"
  | "compositeScore";

export default function Screener() {
  const [selected, setSelected] = useState<Stock | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("compositeScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: snap, isLoading } = useQuery<Snapshot>({ queryKey: ["/api/snapshot"] });
  const { data: watchlist } = useQuery<WatchlistItem[]>({ queryKey: ["/api/watchlist"] });
  const wlSymbols = new Set((watchlist || []).map((w) => w.symbol));

  const stocks = snap?.stocks || [];
  const sectors = useMemo(
    () => Array.from(new Set(stocks.map((s) => s.sector).filter(Boolean))).sort(),
    [stocks],
  );

  const rows = useMemo(() => {
    let r = stocks.filter((s) => {
      const q = search.trim().toLowerCase();
      const matchQ = !q || s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
      const matchSec = sector === "all" || s.sector === sector;
      return matchQ && matchSec;
    });
    r = [...r].sort((a, b) => {
      const av = (a[sortKey] ?? -Infinity) as number | string;
      const bv = (b[sortKey] ?? -Infinity) as number | string;
      let cmp: number;
      if (typeof av === "string" && typeof bv === "string") cmp = av.localeCompare(bv);
      else cmp = (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return r;
  }, [stocks, search, sector, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "symbol" ? "asc" : "desc");
    }
  };

  const SortHead = ({ k, label, align = "right" }: { k: SortKey; label: string; align?: "left" | "right" }) => (
    <TableHead className={align === "right" ? "text-right" : ""}>
      <button
        onClick={() => toggleSort(k)}
        data-testid={`sort-${k}`}
        className={`inline-flex items-center gap-1 hover:text-foreground ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        {label}
        {sortKey === k ? (
          sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </TableHead>
  );

  const open = (s: Stock) => {
    setSelected(s);
    setSheetOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Screener"
        subtitle="Rank the universe by value, momentum, and analyst signals"
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search symbol or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
            className="pl-9"
          />
        </div>
        <Select value={sector} onValueChange={setSector}>
          <SelectTrigger className="w-[180px]" data-testid="select-sector">
            <SelectValue placeholder="All sectors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sectors</SelectItem>
            {sectors.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="font-normal" data-testid="text-result-count">
          {rows.length} stocks
        </Badge>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead k="rank" label="#" align="left" />
                <SortHead k="symbol" label="Symbol" align="left" />
                <TableHead>Trend</TableHead>
                <SortHead k="price" label="Price" />
                <SortHead k="changePct" label="Chg%" />
                <SortHead k="marketCap" label="Mkt Cap" />
                <SortHead k="pe" label="P/E" />
                <SortHead k="valueScore" label="Value" />
                <SortHead k="momentumScore" label="Mom" />
                <SortHead k="analystScore" label="Analyst" />
                <SortHead k="upsidePct" label="Upside" />
                <SortHead k="compositeScore" label="Composite" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={12}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="py-10 text-center text-sm text-muted-foreground">
                    No stocks match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((s) => (
                  <TableRow
                    key={s.symbol}
                    onClick={() => open(s)}
                    data-testid={`row-stock-${s.symbol}`}
                    className="cursor-pointer"
                  >
                    <TableCell className="text-muted-foreground tabular-nums">{s.rank}</TableCell>
                    <TableCell>
                      <div className="font-semibold">{s.symbol}</div>
                      <div className="max-w-[140px] truncate text-xs text-muted-foreground">{s.name}</div>
                    </TableCell>
                    <TableCell>
                      <MiniSpark data={s.sparkline} up={s.changePct >= 0} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtPrice(s.price)}</TableCell>
                    <TableCell className={`text-right tabular-nums ${changeTone(s.changePct)}`}>
                      {fmtPct(s.changePct, true)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMarketCap(s.marketCap)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.pe != null ? s.pe.toFixed(1) : "—"}
                    </TableCell>
                    <TableCell className={`text-right tabular-nums ${scoreTone(s.valueScore)}`}>
                      {s.valueScore.toFixed(0)}
                    </TableCell>
                    <TableCell className={`text-right tabular-nums ${scoreTone(s.momentumScore)}`}>
                      {s.momentumScore.toFixed(0)}
                    </TableCell>
                    <TableCell className={`text-right tabular-nums ${scoreTone(s.analystScore)}`}>
                      {s.analystScore.toFixed(0)}
                    </TableCell>
                    <TableCell className={`text-right tabular-nums ${changeTone(s.upsidePct)}`}>
                      {fmtPct(s.upsidePct, true)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums ${scoreTone(s.compositeScore)}`}
                      >
                        {s.compositeScore.toFixed(0)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        Click any row for full breakdown. Composite = 35% value + 35% momentum + 30% analyst.
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
