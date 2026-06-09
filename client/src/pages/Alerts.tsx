import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Snapshot,
  Alert,
  METRIC_LABELS,
} from "@/lib/stocks";
import { Bell, Trash2, Plus, BellRing } from "lucide-react";

function fmtThreshold(metric: string, v: number): string {
  if (metric === "price") return "$" + v.toFixed(2);
  if (metric === "compositeScore") return v.toFixed(0);
  return v.toFixed(1) + "%";
}

export default function Alerts() {
  const { toast } = useToast();
  const [symbol, setSymbol] = useState("");
  const [metric, setMetric] = useState("price");
  const [direction, setDirection] = useState("above");
  const [threshold, setThreshold] = useState("");

  const { data: snap } = useQuery<Snapshot>({ queryKey: ["/api/snapshot"] });
  const { data: alerts, isLoading } = useQuery<Alert[]>({ queryKey: ["/api/alerts"] });
  const universe = snap?.stocks || [];

  const createMut = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/alerts", {
        symbol,
        metric,
        direction,
        threshold: parseFloat(threshold),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      setSymbol("");
      setThreshold("");
      toast({ title: "Alert created" });
    },
    onError: () => toast({ title: "Could not create alert", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/alerts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({ title: "Alert deleted" });
    },
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) =>
      apiRequest("PATCH", `/api/alerts/${id}`, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/alerts"] }),
  });

  const canCreate = symbol && threshold !== "" && !isNaN(parseFloat(threshold));
  const list = alerts || [];

  return (
    <div>
      <PageHeader
        title="Alerts"
        subtitle="Get notified by email and in-app when a stock crosses your threshold"
      />

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" /> New alert
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Stock</label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger data-testid="select-alert-symbol">
                  <SelectValue placeholder="Symbol…" />
                </SelectTrigger>
                <SelectContent>
                  {universe.map((s) => (
                    <SelectItem key={s.symbol} value={s.symbol}>
                      {s.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Metric</label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger data-testid="select-alert-metric">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(METRIC_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Condition</label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger data-testid="select-alert-direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">Rises above</SelectItem>
                  <SelectItem value="below">Falls below</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Threshold</label>
              <Input
                type="number"
                step="any"
                placeholder={metric === "price" ? "e.g. 150" : "e.g. 70"}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                data-testid="input-threshold"
              />
            </div>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!canCreate || createMut.isPending}
              className="gap-2"
              data-testid="button-create-alert"
            >
              <Bell className="h-4 w-4" /> Create
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <BellRing className="h-10 w-10 text-muted-foreground/40" />
            <div>
              <p className="font-medium">No alerts yet</p>
              <p className="text-sm text-muted-foreground">
                Create a rule above and we'll watch the market for you.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <Bell className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{a.symbol}</span>
                      {!a.active && (
                        <Badge variant="secondary" className="font-normal text-[10px]">
                          paused
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {METRIC_LABELS[a.metric] || a.metric} {a.direction === "above" ? "rises above" : "falls below"}{" "}
                      <span className="font-medium text-foreground">{fmtThreshold(a.metric, a.threshold)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!!a.active}
                      onCheckedChange={(c) => toggleMut.mutate({ id: a.id, active: c })}
                      data-testid={`switch-alert-${a.id}`}
                    />
                    <span className="text-xs text-muted-foreground">{a.active ? "Active" : "Off"}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={() => deleteMut.mutate(a.id)}
                    data-testid={`button-delete-alert-${a.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        Alerts are checked automatically by a scheduled task. When triggered, you'll get an email and in-app notification.
      </p>
    </div>
  );
}
