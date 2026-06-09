import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

export function MiniSpark({ data, up }: { data?: number[]; up: boolean }) {
  if (!data || data.length < 2) return <div className="h-8 w-20" />;
  const series = data.map((v, i) => ({ i, v }));
  const stroke = up ? "hsl(152 60% 45%)" : "hsl(350 75% 55%)";
  return (
    <div className="h-8 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line type="monotone" dataKey="v" stroke={stroke} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
