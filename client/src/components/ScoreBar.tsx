import { cn } from "@/lib/utils";

export function ScoreBar({ value, label, className }: { value: number; label?: string; className?: string }) {
  const tone =
    value >= 70 ? "bg-emerald-500" : value >= 55 ? "bg-amber-500" : "bg-muted-foreground/50";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>}
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums">{value.toFixed(0)}</span>
    </div>
  );
}

export function RangeBar({ low, high, current, label }: { low: number | null; high: number | null; current: number | null; label?: string }) {
  if (low == null || high == null || current == null || high <= low) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const pct = ((current - low) / (high - low)) * 100;
  return (
    <div className="w-full">
      {label && <div className="mb-1 text-xs text-muted-foreground">{label}</div>}
      <div className="relative h-1.5 w-full rounded-full bg-gradient-to-r from-rose-500/40 via-amber-500/40 to-emerald-500/40">
        <div
          className="absolute top-1/2 h-3 w-1 -translate-y-1/2 rounded-full bg-foreground"
          style={{ left: `calc(${Math.max(0, Math.min(100, pct))}% - 2px)` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
        <span>${low.toFixed(0)}</span>
        <span>${high.toFixed(0)}</span>
      </div>
    </div>
  );
}
